import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiConfigurationError } from '@/services/api';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      console.error('Unhandled render error', error);
    }
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const isConfigError = this.state.error instanceof ApiConfigurationError;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>APP ERROR</Text>
          <Text style={styles.title}>
            {isConfigError ? 'API configuration is missing' : 'Something went wrong'}
          </Text>
          <Text style={styles.body}>
            {isConfigError
              ? 'Set EXPO_PUBLIC_API_URL before launching this build.'
              : 'A screen crashed during rendering. Reset the view and retry.'}
          </Text>
          {!isConfigError ? (
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#dc2626',
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  button: {
    marginTop: 18,
    alignSelf: 'flex-start',
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
