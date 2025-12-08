import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Extension } from '@tiptap/core';
import { useEffect, useState } from 'react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label'; // Ensure you have this or use simple span
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, 
  Undo, Redo, Code, TerminalSquare, 
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  Highlighter, Palette, Type, 
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon, 
  Table as TableIcon, Trash2, Minus, 
  Heading1, Heading2, Heading3, 
  MoreHorizontal, Plus, Columns, Rows, Search
} from 'lucide-react';

// --- CUSTOM EXTENSION: FONT SIZE ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#666666' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

// Common presets, but user can now add any
const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Serif', value: 'serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { name: 'Cursive', value: 'cursive' },
];

const FONT_SIZES = [
  '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px', '72px'
];

export const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
  // State for popovers
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // State for custom table dimensions
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // State for custom font
  const [fontSearch, setFontSearch] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true, allowBase64: true }),
      Youtube.configure({ width: 480, height: 320 }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: placeholder || 'Type / to browse options...' }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 border-0 shadow-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  // --- Handlers ---
  const setLink = () => {
    if(linkUrl === '') {
        editor.chain().focus().unsetLink().run();
        return;
    }
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl('');
  };

  const addImage = () => {
    if(imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl('');
    }
  };

  const addYoutube = () => {
    if(youtubeUrl) {
        editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
        setYoutubeUrl('');
    }
  };

  // Logic to apply font from search input
  const applyCustomFont = () => {
    if (fontSearch) {
      editor.chain().focus().setFontFamily(fontSearch).run();
      // Optional: Clear search after applying, or keep it to show what's selected
      // setFontSearch(''); 
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    tooltip 
  }: any) => (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className={`h-8 w-8 p-0 ${isActive ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-col w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden theme-transition">
      
      {/* --- TOOLBAR START --- */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        
        {/* History */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300 dark:border-slate-600">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="Undo">
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="Redo">
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Text Style Dropdowns */}
        <div className="flex items-center gap-2 px-2 border-r border-slate-300 dark:border-slate-600">
          {/* Headings */}
          <Select onValueChange={(value) => {
            if (value === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(value) as any }).run();
          }}>
            <SelectTrigger className="h-8 w-[130px] bg-transparent border-0 focus:ring-0">
              <SelectValue placeholder="Paragraph" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">Normal Text</SelectItem>
              <SelectItem value="1">Heading 1</SelectItem>
              <SelectItem value="2">Heading 2</SelectItem>
              <SelectItem value="3">Heading 3</SelectItem>
              <SelectItem value="4">Heading 4</SelectItem>
            </SelectContent>
          </Select>

          {/* CUSTOM FONT FAMILY SEARCH/INPUT */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-[120px] justify-between px-2 font-normal border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                <span className="truncate">
                    {/* Display current font or "Font" */}
                    {editor.getAttributes('textStyle').fontFamily || "Font"}
                </span>
                <Type className="h-3 w-3 opacity-50 ml-2 text-slate-500 dark:text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Type font (e.g. Aharoni)" 
                            value={fontSearch}
                            onChange={(e) => setFontSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    applyCustomFont();
                                }
                            }}
                            className="h-8 text-xs bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                        />
                        <Button size="sm" onClick={applyCustomFont} className="h-8 w-8 p-0">
                            <Search className="h-3 w-3" />
                        </Button>
                    </div>
                    <Separator />
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">Presets</div>
                        {FONT_FAMILIES.map(font => (
                            <button
                                key={font.value}
                                onClick={() => {
                                    editor.chain().focus().setFontFamily(font.value).run();
                                    setFontSearch(font.name); // Sync input
                                }}
                                className="w-full text-left px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center justify-between text-slate-900 dark:text-slate-100"
                                style={{ fontFamily: font.value }}
                            >
                                {font.name}
                                {editor.isActive('textStyle', { fontFamily: font.value }) && <CheckSquare className="h-3 w-3 text-slate-900"/>}
                            </button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
          </Popover>

          {/* Size */}
          <Select onValueChange={(value) => editor.chain().focus().setFontSize(value).run()}>
            <SelectTrigger className="h-8 w-[80px] bg-transparent border-0 focus:ring-0">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map(size => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Basic Formatting */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-300 dark:border-slate-600">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tooltip="Bold">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tooltip="Italic">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tooltip="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tooltip="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} tooltip="Inline Code">
            <Code className="h-4 w-4" />
          </ToolbarButton>
          
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Palette className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 grid grid-cols-5 gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                {TEXT_COLORS.map(color => (
                    <button
                        key={color.value}
                        onClick={() => editor.chain().focus().setColor(color.value).run()}
                        className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                    />
                ))}
                <Button variant="outline" size="sm" className="col-span-5 mt-2 text-xs dark:border-slate-600 dark:text-slate-100" onClick={() => editor.chain().focus().unsetColor().run()}>Reset</Button>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('highlight') ? 'bg-yellow-200 dark:bg-yellow-800' : ''}`}>
                    <Highlighter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 grid grid-cols-5 gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                {['#ffc078', '#8ce99a', '#74c0fc', '#ffd43b', '#ffa8a8'].map(color => (
                    <button
                        key={color}
                        onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                        className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: color }}
                    />
                ))}
                <Button variant="outline" size="sm" className="col-span-5 mt-2 text-xs dark:border-slate-600 dark:text-slate-100" onClick={() => editor.chain().focus().unsetHighlight().run()}>None</Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Alignment & Lists */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-300 dark:border-slate-600">
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} tooltip="Left">
                <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} tooltip="Center">
                <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} tooltip="Right">
                <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            
            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tooltip="Bullets">
                <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tooltip="Numbering">
                <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} tooltip="Checklist">
                <CheckSquare className="h-4 w-4" />
            </ToolbarButton>
        </div>

        {/* Inserts */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-300 dark:border-slate-600">
            {/* Link */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={editor.isActive('link') ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0">
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="https://example.com" 
                            value={linkUrl} 
                            onChange={(e) => setLinkUrl(e.target.value)} 
                            className="h-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                        />
                        <Button size="sm" onClick={setLink} className="h-8">Set</Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Image */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Image URL" 
                            value={imageUrl} 
                            onChange={(e) => setImageUrl(e.target.value)} 
                            className="h-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                        />
                        <Button size="sm" onClick={addImage} className="h-8">Add</Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Youtube */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <YoutubeIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Youtube URL" 
                            value={youtubeUrl} 
                            onChange={(e) => setYoutubeUrl(e.target.value)} 
                            className="h-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                        />
                        <Button size="sm" onClick={addYoutube} className="h-8">Embed</Button>
                    </div>
                </PopoverContent>
            </Popover>

            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} tooltip="Quote">
                <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="Divider">
                <Minus className="h-4 w-4" />
            </ToolbarButton>
        </div>

        {/* Table & Complex Tools */}
        <div className="flex items-center gap-0.5 px-2">
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant={editor.isActive('table') ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0">
                        <TableIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    <div className="grid gap-3">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">Insert Table</h4>
                            <div className="flex gap-2">
                                <div className="grid gap-1.5 flex-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Rows</span>
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        value={tableRows} 
                                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)} 
                                        className="h-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" 
                                    />
                                </div>
                                <div className="grid gap-1.5 flex-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Cols</span>
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        value={tableCols} 
                                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)} 
                                        className="h-8 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" 
                                    />
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                className="w-full" 
                                onClick={() => {
                                    editor.chain().focus().insertTable({ 
                                        rows: tableRows, 
                                        cols: tableCols, 
                                        withHeaderRow: true 
                                    }).run();
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Insert
                            </Button>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-1">
                             <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-2">Edit Table</h4>
                             <div className="grid grid-cols-2 gap-1">
                                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.can().addColumnBefore()}><Columns className="h-3 w-3 mr-1"/> +Col L</Button>
                                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}><Columns className="h-3 w-3 mr-1"/> +Col R</Button>
                                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.can().addRowBefore()}><Rows className="h-3 w-3 mr-1"/> +Row U</Button>
                                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}><Rows className="h-3 w-3 mr-1"/> +Row D</Button>
                            </div>
                        </div>

                        <Button variant="destructive" size="sm" className="w-full mt-1" onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Table
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')} tooltip="Subscript">
                <SubscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')} tooltip="Superscript">
                <SuperscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} tooltip="Clear Formatting">
                <Trash2 className="h-4 w-4 text-red-500" />
            </ToolbarButton>
        </div>
      </div>

      {/* --- EDITOR CONTENT --- */}
      <div className="relative flex-grow bg-white dark:bg-slate-900">
        <EditorContent editor={editor} className="min-h-[500px]" />
      </div>

      {/* --- FOOTER STATUS BAR --- */}
      <div className="px-4 py-2 text-xs border-t bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 flex justify-between">
        <div>
            {editor ? editor.storage.characterCount?.words() : 0} words
        </div>
        <div>
            {editor ? (editor.isActive('saved') ? 'Saved' : 'Ready') : 'Loading...'}
        </div>
      </div>
    </div>
  );
};