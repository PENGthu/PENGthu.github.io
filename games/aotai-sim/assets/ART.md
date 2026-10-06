# 原创情境素材 / 2026-10-06

使用内置 `image_gen` 工具生成（非 CLI/API 回退），每件素材单独生成。背景保存为 JPEG，人物转换为带原始透明通道的 WebP，用于减少下载体积。代码绘制前景物件位于 `../scene-props.mjs`。生成工具的原始 PNG 保留在 Codex 的 generated_images 目录。

本次最终文件：

- `characters/warden.webp`：值守员，站立。
- `characters/luning.webp`：鹿宁，橙色外套与背包，坐姿。
- `characters/xuzhou.webp`：许舟，蓝色外套、空背包与哨子，坐姿。
- `takin.jpg`：林间羚牛。
- `camp.jpg`：高山营地。
- `river.jpg`：溪流与涉水。
- `hut.jpg`：小屋与联络设备。
- `fog.jpg`：浓雾石坡与背风石槽。
- `lake.jpg`：高山湖泊。

`forest.jpg`、`ridge.jpg` 为此前已生成并上线的原创背景，本次继续使用。

## 人物最终提示词

### 值守员

Original game character cutout for a cinematic Chinese mountain hiking survival visual novel. A fictional Chinese male mountain station warden about 48 years old, weathered compassionate face, short black and grey hair, olive green insulated ranger jacket with NO logos or lettering, dark hiking pants and worn outdoor boots, carrying a plain clipboard and a folded paper notice. Full body, three-quarter front view, relaxed standing posture, facing slightly toward viewer right, expression serious but kind. Realistic painterly concept art with finely detailed fabric and natural face, muted greens, earthy light, realistic proportions, grounded documentary tone matching a photographic mountain environment. Character alone centered and entire body inside frame including boots. Absolutely transparent background, no scenery, no text, no white rectangle, no additional subjects.

### 鹿宁

Original game character cutout for a cinematic Chinese mountain hiking survival visual novel. A fictional Chinese female hiker called Lu Ning, age 27, medium-short tied back dark hair, tired kind face, muted burnt-orange waterproof jacket, charcoal hiking pants, hiking boots, large orange hiking backpack leaning against her. She is seated with one knee bent, holding her ankle with one hand, looking toward the viewer's left as if speaking to a fellow hiker. Entire seated body and backpack fit within frame. Realistic painterly concept art, finely detailed outdoor fabric, natural human proportions, soft neutral cool lighting with warm orange accents, grounded mountain documentary tone. Absolutely transparent background with no scenery, no stones or ground beyond the seated person, no text, no logos, no extra people.

### 许舟

Original game character cutout for a cinematic Chinese mountain survival visual novel. Fictional Chinese male stranded hiker Xu Zhou, age 26, short messy black hair and a worn exhausted face, dark desaturated navy-blue outdoor jacket, grey hiking trousers, hiking boots, empty small grey backpack beside him. He sits hunched with one injured ankle extended and an elbow resting on bent knee, holding a small whistle, looking upward toward a person approaching on his left, conveying fatigue and cautious hope without gore. Full seated body and backpack entirely within frame. Realistic painterly concept art with finely detailed fabric and natural face, soft cold mountain lighting, documentary realism. Absolutely transparent background, no scenery or rocks, no text, no logos, no extra people.

## 环境最终提示词

前三幅使用共同前缀：

Original cinematic environment still for a Chinese mountain hiking survival visual novel. One landscape image 16:9. Realistic natural photography, moody cool light, muted green and slate colors, rich atmospheric detail, no text, no logos, no UI, no people.

### 羚牛（前缀 + 以下内容）

A large golden-grey takin (Budorcas taxicolor, muscular shaggy mountain goat-antelope, stout horns, broad muzzle) standing on the RIGHT side of a narrow misty fir forest trail, facing slightly toward camera, quiet alert wildlife encounter, mossy rocks, trees receding into mist. Clearly visible animal not aggressive, calm center-left area for dialogue overlay.

### 营地（前缀 + 以下内容）

A sheltered high-altitude campsite at blue hour among dark rounded rocks and low fir shrubs, a single burnt orange small hiking tent on the RIGHT, with a compact stove and water bottle beside it, cloud-covered mountain silhouettes behind, a faint warm glow inside tent, dark lower-left foreground left clear for dialogue overlay. No campfires, no people.

### 溪流（前缀 + 以下内容）

Cold mountain meltwater crossing a rocky forest trail, a shallow stream in lower foreground with slippery stepping stones, clear water and ripples, steep mossy banks and pale misty green trees, stream bends to the RIGHT into the background, damp grey rocks, quiet composition with center-left kept fairly calm for narrative overlay.

后三幅使用共同前缀：

Original cinematic environment still for a Chinese mountain hiking survival visual novel. Single landscape image 16:9, realistic photography with painterly cinematic grading, muted earthy colors, natural rich atmospheric textures. NO text, logos, UI or people.

### 小屋（前缀 + 以下内容）

Interior of a tiny mountain shelter, rough aged wooden walls, open wooden doorway on the RIGHT showing cold mountain mist, a small wooden table on the LEFT foreground with an enamel mug of steaming tea, notebook and simple radio, warm lantern hanging overhead, window to blue-grey fog and distant rocks. Warm amber interior contrasts cold outside, cozy but austere, leave central-right space empty for an overlay character.

### 浓雾（前缀 + 以下内容）

High exposed Qinling-style rocky alpine pass in dense moving fog. Jagged grey boulders and a narrow rough path winding toward upper-right through pale mist, dark fir shrubs foreground, a small backwind rock hollow on the RIGHT, cold diffuse light, desaturated graphite and muted olive, eerie visibility, no characters, no buildings.

### 湖泊（前缀 + 以下内容）

A still alpine lake among slate-grey peaks and scattered snow, cold reflective blue-green water, low shrubs and flat shoreline stones in foreground, mist passing across distant mountains and fading afternoon light, rugged tranquil composition, water clearly visible across middle and right, center-left dark rocks for dialogue overlay, no buildings.
