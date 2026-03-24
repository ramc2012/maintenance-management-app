import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COGNITIVE_API_URL = 'http://localhost:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
}

export default function KelvinScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: "Hello! I'm Kelvin AI, your intelligent assistant for the Maintenance Management System. Ask me anything about procurement, equipment, calibration, maintenance, and more!", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${COGNITIVE_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: userMessage.content,
          model: 'tinyllama',
          use_rag: true,
          use_multi_hop: true
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting to my knowledge base. Please make sure the cognitive service is running.\n\nError: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "Show pending procurement cases",
    "Equipment due for calibration",
    "Active workshop jobs",
    "Overdue maintenance items"
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: 'KELVIN AI', headerStyle: { backgroundColor: '#1e1b4b' }, headerTintColor: '#fff' }} />
      
      {/* Quick Questions */}
      {messages.length <= 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBar}>
          {quickQuestions.map((q, i) => (
            <Pressable key={i} style={styles.quickChip} onPress={() => setInput(q)}>
              <Text style={styles.quickText}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.msgContainer, msg.role === 'user' ? styles.userMsgContainer : styles.aiMsgContainer]}>
            {msg.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <MaterialCommunityIcons name="robot" size={16} color="#fff" />
              </View>
            )}
            <View style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.msgText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.content}</Text>
              {msg.sources && msg.sources.length > 0 && (
                <View style={styles.sources}>
                  <Text style={styles.sourcesTitle}>Sources:</Text>
                  {msg.sources.map((s, i) => (
                    <Text key={i} style={styles.sourceItem}>{s.module} ({Math.round(s.relevance * 100)}%)</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="robot" size={16} color="#fff" />
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Kelvin anything..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <Pressable style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0d1a' },
  quickBar: { maxHeight: 50, paddingHorizontal: 12, paddingVertical: 8 },
  quickChip: { backgroundColor: '#2d2a4a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  quickText: { color: '#a5b4fc', fontSize: 12 },
  messages: { flex: 1 },
  messagesContent: { padding: 16 },
  msgContainer: { marginBottom: 16, flexDirection: 'row' },
  userMsgContainer: { justifyContent: 'flex-end' },
  aiMsgContainer: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  msgBubble: { maxWidth: '80%', padding: 14, borderRadius: 16 },
  userBubble: { backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#1e1b4b', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: '#e2e8f0' },
  sources: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  sourcesTitle: { fontSize: 10, color: '#94a3b8', marginBottom: 4 },
  sourceItem: { fontSize: 10, color: '#a5b4fc' },
  loadingContainer: { flexDirection: 'row', marginBottom: 16 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1b4b', padding: 14, borderRadius: 16, borderBottomLeftRadius: 4 },
  loadingText: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', padding: 12, paddingBottom: 24, backgroundColor: '#1e1b4b', borderTopWidth: 1, borderTopColor: '#334155' },
  input: { flex: 1, backgroundColor: '#0f0d1a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendBtnDisabled: { opacity: 0.5 },
});
