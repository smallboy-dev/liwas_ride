# Task 10: Theme Management (Light/Dark Mode) - Implementation Plan

## 🎯 Task Overview

**Goal**: Implement a dual theme (Light/Dark mode) toggle with persistence

**Priority**: Low
**Dependencies**: Task 1 (Authentication)

---

## 📊 Current State Analysis

### ✅ What's Already Set Up

1. **Tailwind Dark Mode**
   - ✅ `tailwind.config.ts` has `darkMode: 'class'`
   - ✅ Supports dark mode via CSS classes
   - ✅ All components use `dark:` variants

2. **Layout Structure**
   - ✅ `app/layout.tsx` has `<html className="light">`
   - ✅ `suppressHydrationWarning` already set
   - ✅ Ready for dynamic theme switching

3. **Provider Setup**
   - ✅ `app/providers.tsx` exists
   - ✅ Multiple providers already configured
   - ✅ Ready to add ThemeProvider

### ⏳ What We Need to Build

1. **ThemeContext** - Manage theme state
2. **ThemeProvider** - Wrap app with theme logic
3. **useTheme Hook** - Easy access to theme functions
4. **Theme Toggle Button** - UI component to switch themes
5. **localStorage Integration** - Persist user preference
6. **Global Styling** - Apply theme across app

---

## 📋 Implementation Steps

### Step 1: Create ThemeContext
**File**: `context/ThemeContext.tsx`

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    if (newTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
```

### Step 2: Create useTheme Hook
**File**: `hooks/useTheme.ts`

```typescript
"use client";

import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
```

### Step 3: Update Providers
**File**: `app/providers.tsx`

Add ThemeProvider to wrap all other providers:

```typescript
import { ThemeProvider } from "@/context/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <AuthProvider>
          {/* ... rest of providers ... */}
        </AuthProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
```

### Step 4: Create Theme Toggle Button
**File**: `components/ui/ThemeToggle.tsx`

```typescript
"use client";

import { useTheme } from "@/hooks/useTheme";
import { SunIcon, MoonIcon } from "@/components/ui/icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <MoonIcon className="w-5 h-5 text-gray-700" />
      ) : (
        <SunIcon className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
}
```

### Step 5: Add Missing Icons
**File**: `components/ui/icons.tsx`

Add SunIcon and MoonIcon:

```typescript
export function SunIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1m-16 0H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export function MoonIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
```

### Step 6: Add Theme Toggle to Header
**File**: `components/admin/AdminLayout.tsx` (and other layouts)

Add ThemeToggle to header:

```typescript
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// In the header section:
<div className="flex items-center gap-4">
  <ThemeToggle />
  {/* ... other header items ... */}
</div>
```

### Step 7: Update Layout
**File**: `app/layout.tsx`

Update to support dynamic theme:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## 🧪 Testing Checklist

### Test 1: Toggle Functionality
- [ ] Theme toggle button visible in UI
- [ ] Click toggle switches from light to dark
- [ ] Click again switches back to light
- [ ] Icon changes (sun ↔ moon)

### Test 2: Persistence
- [ ] Switch to dark mode
- [ ] Refresh page
- [ ] Dark mode persists
- [ ] Switch to light mode
- [ ] Refresh page
- [ ] Light mode persists

### Test 3: Global Styling
- [ ] Admin pages: Light/dark mode works
- [ ] Vendor pages: Light/dark mode works
- [ ] Driver pages: Light/dark mode works
- [ ] All text readable in both modes
- [ ] All buttons visible in both modes
- [ ] All cards styled correctly in both modes

### Test 4: Default Theme
- [ ] Clear localStorage
- [ ] Reload page
- [ ] Defaults to light mode
- [ ] Check system preference (if dark preferred, should use dark)

### Test 5: Component Styling
- [ ] Badges display correctly
- [ ] Cards have proper contrast
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Forms are usable
- [ ] Tables are readable

---

## 📁 Files to Create/Modify

### Create
- [ ] `context/ThemeContext.tsx` - Theme context and provider
- [ ] `hooks/useTheme.ts` - useTheme hook
- [ ] `components/ui/ThemeToggle.tsx` - Theme toggle button

### Modify
- [ ] `components/ui/icons.tsx` - Add SunIcon, MoonIcon
- [ ] `app/providers.tsx` - Add ThemeProvider
- [ ] `app/layout.tsx` - Remove hardcoded "light" class
- [ ] `components/admin/AdminLayout.tsx` - Add ThemeToggle
- [ ] `components/vendor/VendorLayout.tsx` - Add ThemeToggle
- [ ] `components/vendor/DriverLayout.tsx` - Add ThemeToggle

---

## ✅ Success Criteria

Task 10 is **COMPLETE** when:

- [ ] ThemeContext created and working
- [ ] useTheme hook available
- [ ] Theme toggle button visible and functional
- [ ] Theme persists in localStorage
- [ ] Light mode works across all pages
- [ ] Dark mode works across all pages
- [ ] All text readable in both modes
- [ ] All components styled correctly
- [ ] Default theme is light
- [ ] System preference respected (optional)
- [ ] No console errors
- [ ] No hydration warnings

---

## 🎯 Implementation Order

1. **Create ThemeContext** (5 min)
2. **Create useTheme Hook** (2 min)
3. **Add Icons** (3 min)
4. **Create ThemeToggle Component** (5 min)
5. **Update Providers** (2 min)
6. **Update Layouts** (10 min)
7. **Test All Pages** (15 min)

**Total Time**: ~45 minutes

---

## 💡 Key Points

- ✅ Tailwind already configured for dark mode
- ✅ Using `class` strategy (not `media`)
- ✅ localStorage for persistence
- ✅ System preference as fallback
- ✅ Hydration-safe implementation
- ✅ Easy to use with `useTheme()` hook

---

## 🚀 Next Steps After Task 10

**Task 11**: Login Page UI & Authentication Integration
- Create modern login page
- Integrate with AuthContext
- Support light/dark themes
- Form validation with react-hook-form

---

## 📚 Resources

- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [React Context API](https://react.dev/reference/react/useContext)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

