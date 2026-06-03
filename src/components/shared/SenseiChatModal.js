import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { TXT1, TXT2, TXT3 } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';
import * as ai from '../../services/aiService';

const GOLD = '#D4A853';

/**
 * Single-turn "ask the sensei". On-device Gemini Nano when available,
 * otherwise a deterministic SENSEI_PHRASES line (passed as fallbackPhrase).
 * Single-turn is deliberate: the on-device model caps output at ~256
 * tokens, so a multi-turn transcript would be misleading.
 */
export default function SenseiChatModal({ visible, onClose, context, fallbackPhrase, aiEnabled }) {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setReply(null);
    const answer = await ai.senseiReply({ userText: text, context: context || '', fallback: fallbackPhrase });
    setReply(answer);
    setBusy(false);
  };

  const close = () => { setInput(''); setReply(null); setBusy(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={st.backdrop} onPress={close}>
        <Pressable style={st.card} onPress={() => {}}>
          <View style={st.header}>
            <View style={[st.pip, { backgroundColor: GOLD }]} />
            <Text style={[st.title, { color: GOLD }]}>ASK THE SENSEI</Text>
          </View>

          {!aiEnabled && (
            <Text style={st.note}>
              On-device sensei is unavailable here — you’ll receive a teaching, not a conversation.
            </Text>
          )}

          <TextInput
            style={st.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your training…"
            placeholderTextColor={TXT3}
            multiline
            maxLength={300}
            accessibilityLabel="Question for the sensei"
          />

          {busy && <ActivityIndicator color={GOLD} style={{ marginVertical: DS.space.sm }} />}
          {reply != null && !busy && <Text style={st.reply}>{reply}</Text>}

          <View style={st.row}>
            <Pressable onPress={close} style={[st.btn, st.btnGhost]} accessibilityRole="button">
              <Text style={st.btnGhostTxt}>CLOSE</Text>
            </Pressable>
            <Pressable
              onPress={ask}
              disabled={busy || !input.trim()}
              style={[st.btn, { backgroundColor: GOLD, opacity: busy || !input.trim() ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Send question to the sensei"
            >
              <Text style={st.btnTxt}>ASK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000B0', justifyContent: 'center', padding: DS.space.lg },
  card: { backgroundColor: '#15130E', borderRadius: 16, borderWidth: 1, borderColor: GOLD + '40', padding: DS.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: DS.space.xs, marginBottom: DS.space.sm },
  pip: { width: 3, height: 16, borderRadius: 2 },
  title: { fontSize: 8, fontWeight: '700', letterSpacing: 4 },
  note: { fontSize: 11, color: TXT3, marginBottom: DS.space.sm, lineHeight: 16 },
  input: {
    color: TXT1, fontSize: 14, borderWidth: 1, borderColor: GOLD + '30', borderRadius: 10,
    padding: DS.space.sm, minHeight: 56, textAlignVertical: 'top', marginBottom: DS.space.sm,
  },
  reply: { color: TXT2, fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginBottom: DS.space.sm },
  row: { flexDirection: 'row', gap: DS.space.sm, justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnGhost: { borderWidth: 1, borderColor: TXT3 + '50' },
  btnGhostTxt: { color: TXT2, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  btnTxt: { color: '#15130E', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
