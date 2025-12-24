import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
}) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedHeading, setSelectedHeading] = useState<number | null>(null);

  const { isDark } = useTheme();

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088'
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#ffffff',
    },
    toolbar: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      flexWrap: 'wrap',
    },
    toolbarSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      marginBottom: 8,
    },
    toolbarSeparator: {
      width: 1,
      height: 24,
      backgroundColor: isDark ? '#4b5563' : '#d1d5db',
      marginHorizontal: 8,
    },
    toolbarButton: {
      padding: 8,
      marginHorizontal: 2,
      borderRadius: 6,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      minWidth: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarButtonActive: {
      backgroundColor: '#3b82f6',
    },
    toolbarButtonText: {
      color: isDark ? '#f9fafb' : '#111827',
      fontSize: 14,
      fontWeight: '600',
    },
    toolbarButtonTextActive: {
      color: '#ffffff',
    },
    contentContainer: {
      flex: 1,
      padding: 16,
    },
    textInput: {
      fontSize: 16,
      color: isDark ? '#f9fafb' : '#111827',
      minHeight: 200,
      textAlignVertical: 'top',
      lineHeight: 24,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogContent: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      padding: 24,
      borderRadius: 12,
      width: screenWidth * 0.9,
      maxWidth: 400,
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 16,
    },
    dialogButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    dialogButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    dialogButtonPrimary: {
      backgroundColor: '#3b82f6',
    },
    dialogButtonSecondary: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    dialogButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    dialogButtonTextSecondary: {
      color: isDark ? '#f9fafb' : '#111827',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      margin: 4,
      borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
    },
    colorOptionSelected: {
      borderColor: '#3b82f6',
      borderWidth: 3,
    },
  });

  const insertText = (text: string) => {
    const newValue = value + text;
    onChange(newValue);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const newValue = value + prefix + suffix;
    onChange(newValue);
  };

  const handleBold = () => {
    setIsBold(!isBold);
    insertMarkdown('**', '**');
  };

  const handleItalic = () => {
    setIsItalic(!isItalic);
    insertMarkdown('*', '*');
  };

  const handleUnderline = () => {
    setIsUnderline(!isUnderline);
    insertMarkdown('__', '__');
  };

  const handleStrikethrough = () => {
    setIsStrikethrough(!isStrikethrough);
    insertMarkdown('~~', '~~');
  };

  const handleHeading = (level: number) => {
    setSelectedHeading(selectedHeading === level ? null : level);
    insertMarkdown('#'.repeat(level) + ' ');
  };

  const handleLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkConfirm = () => {
    if (linkUrl.trim()) {
      const text = linkText.trim() || linkUrl;
      insertMarkdown(`[${text}](${linkUrl})`);
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    } else {
      Alert.alert('Error', 'Please enter a valid URL');
    }
  };

  const handleImage = () => {
    setShowImageDialog(true);
  };

  const handleImageConfirm = () => {
    if (imageUrl.trim()) {
      insertMarkdown(`![${imageUrl}](${imageUrl})`);
      setImageUrl('');
      setShowImageDialog(false);
    } else {
      Alert.alert('Error', 'Please enter a valid image URL');
    }
  };

  const handleColor = () => {
    setShowColorDialog(true);
  };

  const handleColorConfirm = () => {
    insertMarkdown(`<span style="color: ${selectedColor}">`, '</span>');
    setShowColorDialog(false);
  };

  const handleList = (ordered: boolean = false) => {
    insertMarkdown(ordered ? '1. ' : '- ');
  };

  const handleQuote = () => {
    insertMarkdown('> ');
  };

  const handleCode = () => {
    insertMarkdown('`', '`');
  };

  const handleCodeBlock = () => {
    insertMarkdown('```\n', '\n```');
  };

  const handleHorizontalRule = () => {
    insertMarkdown('\n---\n');
  };

  const handleTable = () => {
    insertMarkdown('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n');
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbar}>
        {/* Text Formatting Section */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity
            style={[styles.toolbarButton, isBold && styles.toolbarButtonActive]}
            onPress={handleBold}
          >
            <Text style={[styles.toolbarButtonText, isBold && styles.toolbarButtonTextActive]}>
              B
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, isItalic && styles.toolbarButtonActive]}
            onPress={handleItalic}
          >
            <Text style={[styles.toolbarButtonText, isItalic && styles.toolbarButtonTextActive]}>
              I
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, isUnderline && styles.toolbarButtonActive]}
            onPress={handleUnderline}
          >
            <Text style={[styles.toolbarButtonText, isUnderline && styles.toolbarButtonTextActive]}>
              U
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, isStrikethrough && styles.toolbarButtonActive]}
            onPress={handleStrikethrough}
          >
            <Text style={[styles.toolbarButtonText, isStrikethrough && styles.toolbarButtonTextActive]}>
              S
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarSeparator} />

        {/* Headings Section */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity
            style={[styles.toolbarButton, selectedHeading === 1 && styles.toolbarButtonActive]}
            onPress={() => handleHeading(1)}
          >
            <Text style={[styles.toolbarButtonText, selectedHeading === 1 && styles.toolbarButtonTextActive]}>
              H1
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, selectedHeading === 2 && styles.toolbarButtonActive]}
            onPress={() => handleHeading(2)}
          >
            <Text style={[styles.toolbarButtonText, selectedHeading === 2 && styles.toolbarButtonTextActive]}>
              H2
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, selectedHeading === 3 && styles.toolbarButtonActive]}
            onPress={() => handleHeading(3)}
          >
            <Text style={[styles.toolbarButtonText, selectedHeading === 3 && styles.toolbarButtonTextActive]}>
              H3
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarSeparator} />

        {/* Links & Media Section */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleLink}>
            <Ionicons name="link-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleImage}>
            <Ionicons name="image-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleColor}>
            <Ionicons name="color-palette-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarSeparator} />

        {/* Lists & Structure Section */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => handleList(false)}>
            <Text style={styles.toolbarButtonText}>•</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={() => handleList(true)}>
            <Text style={styles.toolbarButtonText}>1.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleQuote}>
            <Ionicons name="chatbubble-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarSeparator} />

        {/* Code Section */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleCode}>
            <Text style={styles.toolbarButtonText}>&lt;/&gt;</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleCodeBlock}>
            <Text style={styles.toolbarButtonText}>{'{ }'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarSeparator} />

        {/* More Options */}
        <View style={styles.toolbarSection}>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleHorizontalRule}>
            <Ionicons name="remove-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleTable}>
            <Ionicons name="grid-outline" size={18} color={isDark ? '#f9fafb' : '#111827'} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ScrollView style={styles.contentContainer}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Link Dialog */}
      <Modal visible={showLinkDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Insert Link</Text>
            <TextInput
              style={styles.input}
              placeholder="Link text (optional)"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={linkText}
              onChangeText={setLinkText}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter URL"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonSecondary]}
                onPress={() => setShowLinkDialog(false)}
              >
                <Text style={styles.dialogButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleLinkConfirm}
              >
                <Text style={styles.dialogButtonText}>Insert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Dialog */}
      <Modal visible={showImageDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Insert Image</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter image URL"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonSecondary]}
                onPress={() => setShowImageDialog(false)}
              >
                <Text style={styles.dialogButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleImageConfirm}
              >
                <Text style={styles.dialogButtonText}>Insert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Dialog */}
      <Modal visible={showColorDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Select Color</Text>
            <View style={styles.colorGrid}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonSecondary]}
                onPress={() => setShowColorDialog(false)}
              >
                <Text style={styles.dialogButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleColorConfirm}
              >
                <Text style={styles.dialogButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RichTextEditor;
