# 起動方法

`wireframe-mock/index.html` をブラウザで開く。

# Desktop / Mobileの想定幅

- Desktop: 1440px級、中央コンテンツ最大幅1180px
- Mobile: 390px幅、縦スクロールあり・横スクロールなし

# 実装したダミー操作

- SET 01～03の選択と、変更時の再生停止・シーク位置リセット
- 各SETのDon / Kaローカル音声ファイル選択と読込済み状態表示
- 5曲の選択、CD仮ラベルの追従、変更時の再生停止・シーク位置リセット
- 30秒のダミータイマーによる再生・一時停止・同位置からの再開
- シークバーによる任意位置への移動と現在時間表示

# このモックでは未実装の正式機能

- Web Audio API / OfflineAudioContextによる正式再生
- music.ogg再生、chart.json同期、大音符を含むHitObject再生
- Effect上限制御、Musicラウドネス制御、Raised-Cosine Fade
- 本番波形解析、本番CD画像、本番CSSアニメーション
- 本番カラー、フォント、グロー、点灯デザイン、背景・装飾
- GitHub Pages公開
