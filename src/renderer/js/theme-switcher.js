/**
 * Multi Grep Replacer - Theme Switcher
 * テーマ切り替え機能・システムテーマ検出・設定永続化
 */

class ThemeSwitcher {
  constructor() {
    // テーマ定義
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      AUTO: 'auto',
    };

    // テーマアイコン定義
    this.THEME_ICONS = {
      [this.THEMES.LIGHT]: '🌙', // ライトモードの時は月アイコン（ダークに切り替え）
      [this.THEMES.DARK]: '☀️', // ダークモードの時は太陽アイコン（ライトに切り替え）
      [this.THEMES.AUTO]: '🌓', // オートモードの時は半月アイコン
    };

    // 現在のテーマ
    this.currentTheme = this.THEMES.LIGHT;
    this.systemTheme = this.detectSystemTheme();
    this.isInitialized = false;

    // DOM要素
    this.bodyElement = null;
    this.themeToggleButton = null;
    this.themeIconElement = null;

    console.log('🎨 Theme Switcher initializing...');
    this.initialize();
  }

  /**
   * テーマスイッチャー初期化
   */
  initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupThemeSwitcher());
    } else {
      this.setupThemeSwitcher();
    }
  }

  /**
   * テーマスイッチャー設定
   */
  setupThemeSwitcher() {
    console.log('🎨 Setting up theme switcher...');

    // DOM要素取得
    this.cacheElements();

    // 保存されたテーマ読み込み
    this.loadSavedTheme();

    // システムテーマ変更監視
    this.setupSystemThemeListener();

    // イベントリスナー設定
    this.setupEventListeners();

    // 初期テーマ適用
    this.applyTheme(this.currentTheme);

    this.isInitialized = true;
    console.log('✅ Theme switcher setup completed');
  }

  /**
   * DOM要素キャッシュ
   */
  cacheElements() {
    this.bodyElement = document.body;
    this.themeToggleButton = document.getElementById('themeToggle');
    this.themeIconElement = this.themeToggleButton?.querySelector('.theme-icon');

    if (!this.themeToggleButton) {
      console.warn('⚠️ Theme toggle button not found');
    }

    if (!this.themeIconElement) {
      console.warn('⚠️ Theme icon element not found');
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    if (this.themeToggleButton) {
      this.themeToggleButton.addEventListener('click', () => this.handleThemeToggle());
    }

    // キーボードショートカット（Ctrl/Cmd + Shift + T）
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        this.handleThemeToggle();
      }
    });
  }

  /**
   * システムテーマ検出
   */
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  }

  /**
   * システムテーマ変更監視
   */
  setupSystemThemeListener() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // 初期システムテーマ取得
      this.systemTheme = darkModeQuery.matches ? this.THEMES.DARK : this.THEMES.LIGHT;

      // システムテーマ変更監視
      darkModeQuery.addEventListener('change', event => {
        this.systemTheme = event.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
        console.log(`🎨 System theme changed to: ${this.systemTheme}`);

        // AUTOモードの場合は即座に反映
        if (this.currentTheme === this.THEMES.AUTO) {
          this.applyTheme(this.THEMES.AUTO);
        }
      });
    }
  }

  /**
   * テーマ切り替えハンドラー
   */
  handleThemeToggle() {
    const startTime = performance.now();

    // 次のテーマを決定
    const nextTheme = this.getNextTheme();

    // テーマ適用
    this.applyTheme(nextTheme);

    // パフォーマンス監視
    const responseTime = performance.now() - startTime;
    if (
      window.performanceMonitor &&
      typeof window.performanceMonitor.recordResponse === 'function'
    ) {
      window.performanceMonitor.recordResponse('themeToggle', responseTime);
    }

    // 応答性確認
    if (responseTime > 100) {
      console.warn(`⚠️ Theme toggle slow response: ${responseTime.toFixed(2)}ms`);
    } else {
      console.log(`🎨 Theme toggle response: ${responseTime.toFixed(2)}ms`);
    }

    console.log(`🎨 Theme switched to: ${nextTheme}`);
  }

  /**
   * 次のテーマ取得
   */
  getNextTheme() {
    switch (this.currentTheme) {
      case this.THEMES.LIGHT:
        return this.THEMES.DARK;
      case this.THEMES.DARK:
        return this.THEMES.AUTO;
      case this.THEMES.AUTO:
        return this.THEMES.LIGHT;
      default:
        return this.THEMES.LIGHT;
    }
  }

  /**
   * テーマ適用
   */
  applyTheme(theme) {
    if (!this.bodyElement) {
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = theme;

    // テーマ切り替えアニメーション開始
    this.startThemeTransition();

    // bodyクラス更新
    this.updateBodyClass(theme);

    // アイコン更新
    this.updateThemeIcon(theme);

    // テーマ設定保存
    this.saveTheme(theme);

    // テーマ適用完了後の処理
    setTimeout(() => {
      this.endThemeTransition();
      this.notifyThemeChange(theme, previousTheme);
    }, 300);
  }

  /**
   * bodyクラス更新
   */
  updateBodyClass(theme) {
    // 既存のテーマクラスを削除
    Object.values(this.THEMES).forEach(themeValue => {
      this.bodyElement.classList.remove(`theme-${themeValue}`);
    });

    // 新しいテーマクラスを追加
    this.bodyElement.classList.add(`theme-${theme}`);
  }

  /**
   * テーマアイコン更新
   */
  updateThemeIcon(_theme) {
    if (!this.themeIconElement) {
      return;
    }

    // CSSの::beforeでアイコンが管理されるため、textContentは設定しない
    // アニメーション効果
    this.themeIconElement.classList.add('scale-in');
    setTimeout(() => {
      this.themeIconElement.classList.remove('scale-in');
    }, 200);
  }

  /**
   * テーマ切り替えアニメーション開始
   */
  startThemeTransition() {
    this.bodyElement.classList.add('theme-switching');

    // カスタムプロパティでアニメーション制御
    this.bodyElement.style.setProperty('--theme-transition-duration', '0.3s');
  }

  /**
   * テーマ切り替えアニメーション終了
   */
  endThemeTransition() {
    this.bodyElement.classList.remove('theme-switching');
    this.bodyElement.style.removeProperty('--theme-transition-duration');
  }

  /**
   * テーマ変更通知
   */
  notifyThemeChange(newTheme, previousTheme) {
    // カスタムイベント発火
    const themeChangeEvent = new CustomEvent('themeChanged', {
      detail: {
        newTheme,
        previousTheme,
        effectiveTheme: this.getEffectiveTheme(newTheme),
        timestamp: Date.now(),
      },
    });

    document.dispatchEvent(themeChangeEvent);

    console.log(`🎨 Theme change notification: ${previousTheme} → ${newTheme}`);
  }

  /**
   * 実効テーマ取得（AUTOモード考慮）
   */
  getEffectiveTheme(theme) {
    if (theme === this.THEMES.AUTO) {
      return this.systemTheme;
    }
    return theme;
  }

  /**
   * テーマ設定保存
   */
  saveTheme(theme) {
    try {
      localStorage.setItem('multiGrepReplacer.theme', theme);
      console.log(`💾 Theme saved: ${theme}`);
    } catch (error) {
      console.error('❌ Failed to save theme:', error);
    }
  }

  /**
   * 保存されたテーマ読み込み
   */
  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem('multiGrepReplacer.theme');

      if (savedTheme && Object.values(this.THEMES).includes(savedTheme)) {
        this.currentTheme = savedTheme;
        console.log(`📖 Theme loaded: ${savedTheme}`);
      } else {
        // デフォルトテーマ使用
        this.currentTheme = this.THEMES.LIGHT;
        console.log('🎨 Using default theme: light');
      }
    } catch (error) {
      console.error('❌ Failed to load saved theme:', error);
      this.currentTheme = this.THEMES.LIGHT;
    }
  }

  /**
   * 外部API - テーマ設定
   */
  setTheme(theme) {
    if (!Object.values(this.THEMES).includes(theme)) {
      console.error(`❌ Invalid theme: ${theme}`);
      return false;
    }

    this.applyTheme(theme);
    return true;
  }

  /**
   * 外部API - 現在のテーマ取得
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 外部API - 実効テーマ取得
   */
  getEffectiveCurrentTheme() {
    return this.getEffectiveTheme(this.currentTheme);
  }

  /**
   * 外部API - システムテーマ取得
   */
  getSystemTheme() {
    return this.systemTheme;
  }

  /**
   * 外部API - ダークモード判定
   */
  isDarkMode() {
    return this.getEffectiveCurrentTheme() === this.THEMES.DARK;
  }

  /**
   * 外部API - ライトモード判定
   */
  isLightMode() {
    return this.getEffectiveCurrentTheme() === this.THEMES.LIGHT;
  }

  /**
   * 外部API - オートモード判定
   */
  isAutoMode() {
    return this.currentTheme === this.THEMES.AUTO;
  }

  /**
   * 外部API - テーマ初期化状態確認
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * 外部API - テーマ設定リセット
   */
  resetTheme() {
    try {
      localStorage.removeItem('multiGrepReplacer.theme');
      this.applyTheme(this.THEMES.LIGHT);
      console.log('🔄 Theme reset to default');
      return true;
    } catch (error) {
      console.error('❌ Failed to reset theme:', error);
      return false;
    }
  }

  /**
   * 外部API - テーマ統計情報取得
   */
  getThemeStats() {
    return {
      currentTheme: this.currentTheme,
      effectiveTheme: this.getEffectiveCurrentTheme(),
      systemTheme: this.systemTheme,
      availableThemes: Object.values(this.THEMES),
      isInitialized: this.isInitialized,
      supportsSystemTheme: !!window.matchMedia,
    };
  }

  /**
   * デバッグ用 - テーマ状態ログ出力
   */
  logThemeState() {
    console.log('🎨 Theme State:', {
      currentTheme: this.currentTheme,
      effectiveTheme: this.getEffectiveCurrentTheme(),
      systemTheme: this.systemTheme,
      bodyClasses: Array.from(this.bodyElement.classList),
      isInitialized: this.isInitialized,
    });
  }
}

// ThemeSwitcherインスタンス作成（グローバル）
window.themeSwitcher = new ThemeSwitcher();

// テーマ変更イベントリスナー（デバッグ用）
document.addEventListener('themeChanged', event => {
  console.log('🎨 Theme changed event:', event.detail);
});
