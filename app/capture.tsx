import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from 'expo-speech-recognition'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { AddEventModal } from '@/components/add-event-modal'
import { getTheme } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import {
  createCaptureItem,
  getAllCaptureItems,
  deleteCaptureItem,
  createEntry,
  createRecurrenceRule,
} from '@/db'
import { CaptureItem } from '@/types'
import { formatDateString } from '@/utils/dateUtils'

export default function CaptureScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = getTheme(colorScheme)
  const inputRef = useRef<TextInput>(null)

  const [input, setInput] = useState('')
  const [items, setItems] = useState<CaptureItem[]>([])
  const [schedulingItem, setSchedulingItem] =
    useState<CaptureItem | null>(null)
  const [isModalVisible, setIsModalVisible] =
    useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const pulseAnim = useRef(new Animated.Value(1)).current

  const loadItems = useCallback(async () => {
    const rows = await getAllCaptureItems()
    setItems(rows)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadItems()
    }, [loadItems])
  )

  const handleAdd = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    await createCaptureItem(trimmed)
    setInput('')
    await loadItems()
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
    }
  }, [isListening, pulseAnim])

  const startListening = async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Microphone needed',
          'Please allow microphone access in ' +
          'Settings to use voice capture.'
        )
        return
      }

      setIsListening(true)
      setInterimTranscript('')

      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      })
    } catch (error) {
      console.error('[Capture] mic error:', error)
      setIsListening(false)
    }
  }

  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop()
    } catch {}
    setIsListening(false)
    setInterimTranscript('')
  }

  const handleMicPress = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? ''

    if (event.isFinal) {
      setInput(prev => {
        const combined = prev.trim()
          ? `${prev.trim()} ${transcript}`
          : transcript
        return combined
      })
      setInterimTranscript('')
      setIsListening(false)
    } else {
      setInterimTranscript(transcript)
    }
  })

  useSpeechRecognitionEvent('error', (event) => {
    console.error('[Capture] speech error:', event.error)
    setIsListening(false)
    setInterimTranscript('')
  })

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false)
  })

  useEffect(() => {
    return () => {
      if (isListening) {
        ExpoSpeechRecognitionModule
          .stop()
          .catch(() => {})
      }
    }
  }, [isListening])

  const handleDelete = (item: CaptureItem) => {
    Alert.alert(
      'Delete?',
      `Remove "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCaptureItem(item.id)
            await loadItems()
          }
        }
      ]
    )
  }

  const handleSchedule = (item: CaptureItem) => {
    setSchedulingItem(item)
    setIsModalVisible(true)
  }

  const handleModalSave = async (eventData: any) => {
    try {
      const { id } = await createEntry({
        title: schedulingItem?.title ?? eventData.title,
        entry_type: eventData.entryType,
        date: eventData.date,
        start_time: eventData.startTime || '',
        end_time: eventData.endTime || '',
        category: eventData.categoryId,
        notes: '',
        is_completable: eventData.entryType === 'task'
          ? 1 : 0,
      })

      if (eventData.recurrence &&
          eventData.recurrence !== 'none') {
        await createRecurrenceRule(
          id, eventData.recurrence, null, null
        )
      }

      if (schedulingItem) {
        await deleteCaptureItem(schedulingItem.id)
      }

      setIsModalVisible(false)
      setSchedulingItem(null)
      await loadItems()
    } catch (error) {
      console.error('Error scheduling capture item:', error)
    }
  }

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    if (diff < 3600) {
      const mins = Math.floor(diff / 60)
      return mins <= 1 ? 'just now' : `${mins}m ago`
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600)
      return `${hours}h ago`
    }
    const days = Math.floor(diff / 86400)
    return days === 1 ? 'yesterday' : `${days}d ago`
  }

  const renderItem = ({ item }: { item: CaptureItem }) => (
    <View style={[
      styles.itemRow,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }
    ]}>
      <View style={styles.itemContent}>
        <ThemedText style={[
          styles.itemTitle,
          { color: theme.textPrimary }
        ]}>
          {item.title}
        </ThemedText>
        <ThemedText style={[
          styles.itemTime,
          { color: theme.textMuted }
        ]}>
          {formatRelativeTime(item.created_at)}
        </ThemedText>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[
            styles.scheduleButton,
            { backgroundColor: theme.primaryLight }
          ]}
          onPress={() => handleSchedule(item)}
        >
          <ThemedText style={[
            styles.scheduleButtonText,
            { color: theme.primary }
          ]}>
            Schedule →
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteButton}
          hitSlop={{ top: 8, bottom: 8,
                     left: 8, right: 8 }}
        >
          <Ionicons
            name="close-outline"
            size={20}
            color={theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme.background }
      ]}
      edges={['top', 'bottom']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.textPrimary}
            />
          </TouchableOpacity>
          <ThemedText style={[
            styles.headerTitle,
            { color: theme.textPrimary }
          ]}>
            Capture
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Prompt text */}
        <ThemedText style={[
          styles.prompt,
          { color: theme.textMuted }
        ]}>
          What's on your mind? Just get it out.
        </ThemedText>

        {/* Input area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios'
            ? 'padding' : undefined}
        >
          <View style={[
            styles.inputRow,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }
          ]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                { color: theme.textPrimary }
              ]}
              placeholder="Type anything..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              blurOnSubmit={false}
              autoFocus
              multiline={false}
            />
            <Animated.View style={{
              transform: [{ scale: pulseAnim }]
            }}>
              <TouchableOpacity
                onPress={handleMicPress}
                style={[
                  styles.micButton,
                  {
                    backgroundColor: isListening
                      ? '#E87070'
                      : theme.surface,
                    borderColor: isListening
                      ? '#E87070'
                      : theme.border,
                  }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isListening
                    ? 'mic'
                    : 'mic-outline'}
                  size={20}
                  color={isListening
                    ? '#FFFFFF'
                    : theme.textMuted}
                />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              onPress={handleAdd}
              style={[
                styles.addButton,
                {
                  backgroundColor: input.trim()
                    ? theme.primary
                    : theme.border
                }
              ]}
              disabled={!input.trim()}
            >
              <Ionicons
                name="add"
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {isListening && (
            <View style={[
              styles.listeningBanner,
              { backgroundColor: theme.surface }
            ]}>
              <Ionicons
                name="ellipsis-horizontal"
                size={14}
                color={theme.primary}
              />
              <ThemedText style={[
                styles.interimText,
                { color: theme.textMuted }
              ]}>
                {interimTranscript || 'Listening...'}
              </ThemedText>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Captured items list */}
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[
              styles.emptyTitle,
              { color: theme.textMuted }
            ]}>
              Nothing captured yet
            </ThemedText>
            <ThemedText style={[
              styles.emptySubtitle,
              { color: theme.textMuted }
            ]}>
              Type anything above — no dates,
              no times, no pressure.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

      </ThemedView>

      <AddEventModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setSchedulingItem(null)
        }}
        onSave={handleModalSave}
        selectedDate={formatDateString(new Date())}
        prefilledTitle={schedulingItem?.title}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  prompt: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  interimText: {
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 40,
    gap: 8,
  },
  itemRow: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  itemTime: {
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
