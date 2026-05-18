package expo.modules.gemininano

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import kotlinx.coroutines.guava.await

/**
 * Thin wrapper over the on-device ML Kit GenAI Prompt API (Gemini Nano via
 * AICore). Inference is fully local — no network, no API key.
 *
 * VERIFICATION BOUNDARY: the API surface used here (Generation.getClient,
 * checkStatus, download, generateContent) is verified against Google's
 * published docs (May 2026) but has NOT been compiled/run in this
 * environment — ML Kit GenAI is beta and only runs on AICore devices.
 * The JS layer (src/services/aiService.ts) treats every failure here,
 * and the total absence of this module, as "AI unavailable" and falls
 * back to deterministic behavior. A bug here degrades gracefully; it
 * does not crash the app.
 *
 * Hard model constraints (enforced on the JS side, restated here):
 *   - input < ~4000 tokens, output should stay < ~256 tokens
 *   - no structured/JSON output mode
 *   - English/Korean validated only
 */
class ExpoGeminiNanoModule : Module() {

  private val model: GenerativeModel by lazy { Generation.getClient() }

  override fun definition() = ModuleDefinition {
    Name("ExpoGeminiNano")

    // 'available' | 'unavailable' | 'downloading' | 'downloadable'
    AsyncFunction("checkStatus") Coroutine@{ ->
      when (model.checkStatus().await()) {
        FeatureStatus.AVAILABLE -> "available"
        FeatureStatus.DOWNLOADING -> "downloading"
        FeatureStatus.DOWNLOADABLE -> "downloadable"
        else -> "unavailable"
      }
    }

    // Triggers the AICore-managed Gemini Nano model download. No-ops on
    // the native side if already available; surfaced as a JS state change.
    AsyncFunction("download") Coroutine@{ ->
      model.download().await()
      true
    }

    // Free-form generation. Keep prompts within the documented limits;
    // the JS layer is responsible for trimming input and bounding output.
    AsyncFunction("generate") Coroutine@{ prompt: String ->
      model.generateContent(prompt).await().text ?: ""
    }

    // Summarization is expressed as a constrained prompt instruction
    // rather than the separate genai-summarization artifact (its Kotlin
    // surface was not verified). Output stays short by instruction.
    AsyncFunction("summarize") Coroutine@{ text: String ->
      val prompt =
        "Summarize the following into 2-3 vivid sentences. " +
        "Do not exceed 60 words. Text:\n$text"
      model.generateContent(prompt).await().text ?: ""
    }
  }
}
