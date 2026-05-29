import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { TXT1, TXT2, TXT3, CRIMSON } from '../theme/tokens';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset() {
    this.setState({ error: null, info: null });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={s.root} accessibilityLabel="Application error">
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.kanji}>傷</Text>
          <Text style={s.title}>The blade chipped</Text>
          <Text style={s.subtitle}>
            Something broke while rendering. Your progress is safe on disk.
          </Text>
          <Text style={s.errorLabel}>Error</Text>
          <Text style={s.errorText}>{String(this.state.error?.message ?? this.state.error)}</Text>
          {__DEV__ && this.state.info?.componentStack ? (
            <>
              <Text style={s.errorLabel}>Component stack</Text>
              <Text style={s.stack}>{this.state.info.componentStack}</Text>
            </>
          ) : null}
          <Pressable style={s.button} onPress={this.handleReset} accessibilityRole="button">
            <Text style={s.buttonLabel}>TRY AGAIN</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060303' },
  scroll: { padding: 28, paddingTop: 80, alignItems: 'center' },
  kanji: { color: CRIMSON, fontSize: 88, fontWeight: '900', marginBottom: 16 },
  title: { color: TXT1, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: TXT2, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center', maxWidth: 320 },
  errorLabel: {
    color: TXT3,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginTop: 24,
    marginBottom: 6,
  },
  errorText: {
    color: TXT1,
    fontSize: 13,
    fontFamily: 'Courier',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 8,
  },
  stack: {
    color: TXT3,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Courier',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CRIMSON,
    backgroundColor: CRIMSON + '18',
  },
  buttonLabel: { color: CRIMSON, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
