// Test script to verify notification functionality
// This can be run in the browser console to test mentions

import { extractMentions, extractMentionsFromTags } from './src/utils/userSearch.js';

// Test content mentions
const testContent = 'Hey @John Doe, check this out! Also @Jane Smith should see this.';
const contentMentions = extractMentions(testContent);
console.log('Content mentions:', contentMentions);

// Test tag mentions
const testTags = ['@John Doe', 'web development', '@Jane Smith', 'react'];
const tagMentions = extractMentionsFromTags(testTags);
console.log('Tag mentions:', tagMentions);

// Test edge cases
const edgeCases = [
  '@single',
  '@multi word name',
  '@with_underscore',
  '@123numeric',
  'no mention here',
  '@'
];

edgeCases.forEach(testCase => {
  const mentions = extractMentions(testCase);
  console.log(`"${testCase}" ->`, mentions);
});
