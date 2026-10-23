# 室蘭ボート釣りナビ
室蘭近海のプレジャーボート釣り用スマホWebアプリ（GPS・地図・釣果/根の登録・風と波の重ね合わせ・室蘭の潮汐）。

- 本体：`index.html`（単一HTML＋`tide-data.js`＋オフライン用 `sw.js`）
- 潮汐データ：気象庁 潮位表「室蘭(A8)」2026〜2027年。年が変わったら `python _work/build_tide.py` の年を足して作り直す
- 気象・波：Open-Meteo（登録不要・キー不要）
- 記録はスマホのブラウザ内だけに保存（JSON/GPXで書き出し・取り込み）
- 公開：https://choppermoon1623-tech.github.io/muroran-boat-tsuri/ （デプロイ元 `C:SERSSERDEVPPSMURORAN-BOAT-TSURI` にコピーして PUSH）
- 海洋情報：海しる（海上保安庁）API。試用キーが止まったら個別キーを申請して設定画面へ
- GPSとオフライン保存は https で配信したときだけ動く。PCで `file://` で開くと地図・潮・記録の確認だけできる
- 航海用海図ではない。水深・暗礁は海図で確認すること
