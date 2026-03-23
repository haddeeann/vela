import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAddDraft } from '../types/quickAdd.types';
import { parseQuickAdd } from '../utils/quickAddParser';
import { getTheme } from '../constants/theme';

interface QuickAddInputProps {
  onDraftCreated: (draft: QuickAddDraft) => void;
  theme: ReturnType<typeof getTheme>;
}

export const QuickAddInput: React.FC<QuickAddInputProps> = ({ onDraftCreated, theme }) => {
  const [inputText, setInputText] = useState('');
  const isInputEmpty = inputText.trim() === '';

  const handleSubmit = () => {
    if (isInputEmpty) return;

    const draft = parseQuickAdd(inputText);
    onDraftCreated(draft);
    setInputText('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <TextInput
        style={[styles.input, { color: theme.textPrimary }]}
        placeholder="Add anything... 'dentist Thursday 2pm'"
        placeholderTextColor={theme.textSecondary}
        value={inputText}
        onChangeText={setInputText}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isInputEmpty}
        activeOpacity={0.7}
        style={[styles.submitButton, { opacity: isInputEmpty ? 0.5 : 1 }]}
      >
        <Ionicons
          name="arrow-forward-circle-outline"
          size={28}
          color={theme.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingRight: 8,
  },
  submitButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
