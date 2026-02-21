import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from './shared/ThemeContext';

/**
 * Reusable app logo mark — blue rounded square with bold "T".
 * Use at any size: <LogoMark size={28} /> (navbar) or <LogoMark size={56} /> (profile screen).
 */
export default function LogoMark({ size = 32 }) {
  const { C } = useTheme();
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.52);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Text
        style={{
          color: '#ffffff',
          fontWeight: '900',
          fontSize,
          lineHeight: size,
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}
      >
        T
      </Text>
    </View>
  );
}
