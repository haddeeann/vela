import React, { useRef, useState } from 'react'
import {
  View, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import SignatureCanvas from 'react-native-signature-canvas'
import * as FileSystem from 'expo-file-system/legacy'
import { Ionicons } from '@expo/vector-icons'
import { ThemedText } from './themed-text'
import { getTheme } from '@/constants/theme'

const CANVAS_HEIGHT = 220

interface HandwritingCanvasProps {
  onSaveDrawing: (imageUri: string) => void
  onClose: () => void
  theme: ReturnType<typeof getTheme>
}

export function HandwritingCanvas({
  onSaveDrawing,
  onClose,
  theme,
}: HandwritingCanvasProps) {
  const signatureRef = useRef<any>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleEnd = () => {
    setHasStrokes(true)
  }

  const handleClear = () => {
    signatureRef.current?.clearSignature()
    setHasStrokes(false)
  }

  const handleSave = () => {
    signatureRef.current?.readSignature()
  }

  const handleSignature = async (
    base64: string
  ) => {
    if (!base64) return
    setIsSaving(true)

    try {
      // Remove data:image/png;base64, prefix
      // if present
      const cleanBase64 = base64.replace(
        /^data:image\/\w+;base64,/, ''
      )

      // Save to file system
      const filename = `handwriting_${Date.now()}.png`
      const fileUri =
        `${FileSystem.documentDirectory}${filename}`

      await FileSystem.writeAsStringAsync(
        fileUri,
        cleanBase64,
        { encoding: FileSystem.EncodingType.Base64 }
      )

      onSaveDrawing(fileUri)
      handleClear()
    } catch (error) {
      console.error(
        '[HandwritingCanvas] save error:', error
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleEmpty = () => {
    console.log('[HandwritingCanvas] canvas empty')
  }

  // Style injected into the WebView canvas
  const canvasStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      padding: 0;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body {
      background-color: ${theme.surface};
      margin: 0;
      padding: 0;
    }
  `

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }
    ]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="pencil"
            size={14}
            color={theme.primary}
          />
          <ThemedText style={[
            styles.hint,
            { color: theme.textMuted }
          ]}>
            Write with your stylus
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{
            top: 10, bottom: 10,
            left: 10, right: 10
          }}
        >
          <Ionicons
            name="close"
            size={20}
            color={theme.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={[
        styles.canvasWrap,
        { borderColor: theme.border }
      ]}>
        <SignatureCanvas
          ref={signatureRef}
          onEnd={handleEnd}
          onOK={handleSignature}
          onEmpty={handleEmpty}
          onClear={() => setHasStrokes(false)}
          autoClear={false}
          descriptionText=""
          penColor={theme.textPrimary}
          backgroundColor={theme.surface}
          webStyle={canvasStyle}
          minWidth={1.5}
          maxWidth={3}
          style={styles.canvas}
        />

        {/* Placeholder when empty */}
        {!hasStrokes && (
          <View
            style={styles.placeholder}
            pointerEvents="none"
          >
            <ThemedText style={[
              styles.placeholderText,
              { color: theme.textMuted + '40' }
            ]}>
              Write here...
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { borderColor: theme.border }
          ]}
          onPress={handleClear}
          disabled={!hasStrokes}
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color={
              hasStrokes
                ? theme.textMuted
                : theme.border
            }
          />
          <ThemedText style={[
            styles.actionButtonText,
            { color: hasStrokes
                ? theme.textMuted
                : theme.border }
          ]}>
            Clear
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            {
              backgroundColor: hasStrokes
                ? theme.primary
                : theme.border,
            }
          ]}
          onPress={handleSave}
          disabled={!hasStrokes || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
              />
              <ThemedText style={styles.saveText}>
                Save note
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    fontSize: 13,
  },
  canvasWrap: {
    height: CANVAS_HEIGHT,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: CANVAS_HEIGHT,
  },
  placeholder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 22,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
  },
  saveButton: {
    borderWidth: 0,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
