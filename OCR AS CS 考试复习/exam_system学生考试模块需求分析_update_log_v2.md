# 📘 Exam Practice System - 新增功能说明（2025-04-19）

本次更新引入了多个基于 AI 的自动化功能，并补充了全面的前端 UI 页面，方便题目与知识点的高效管理和可视化浏览。

---

## ✅ 1. AI 自动匹配题目与知识点

### 💡 脚本文件：
`backend/scripts/auto_match_keypoints.py`

### 🧠 功能说明：
- 使用 GPT（OpenAI API）自动识别题干与知识点的相关性
- 根据 `exam_id` 匹配对应题目
- 匹配结果保存到 `question_keypoints` 中间表
- 匹配完成后将 `exams.auto_matched = TRUE`

### ▶️ 使用方式：

```bash
python3 backend/scripts/auto_match_keypoints.py 24
```

---

## ✅ 2. 管理页面：题目绑定知识点

### 📍 地址：
[http://localhost:3000/admin/question-keypoint-binder](http://localhost:3000/admin/question-keypoint-binder)

### ✨ 功能：
- 支持全文搜索题目
- 可打钩选择每道题关联的知识点
- ✅ 显示 AI 推荐的知识点（带 `✅` 标记）
- 🔁 一键恢复为“AI 推荐匹配”
- 📥 点击“保存绑定关系”将结果写入数据库

---

## ✅ 3. 浏览页面：题目与知识点匹配情况

### 📍 地址：
[http://localhost:3000/admin/question-keypoint-browser](http://localhost:3000/admin/question-keypoint-browser)

### ✨ 功能：
- Tabs 分页切换：
  - 按题目查看 → 展示每题关联的知识点
  - 按知识点查看 → 展示每个知识点对应题目
- 支持模糊搜索
- UI 清晰简洁，方便教研人员浏览与审核

---

## ✅ 4. 导出功能：题目-知识点匹配结果

### 📄 脚本文件：
`scripts/export_question_keypoints.py`

### 📤 功能说明：
- 导出所有题目与知识点的匹配关系
- 格式：`question_id, question_text, keypoint_id, keypoint_name`
- 输出文件：`question_keypoints.csv`

### ▶️ 使用方式：

```bash
python3 scripts/export_question_keypoints.py
```

---

## ✅ 5. 新增数据库结构

### 🔄 中间表：`question_keypoints`
| 字段名        | 类型  | 描述              |
|---------------|--------|-------------------|
| `question_id` | INT    | 题目 ID（外键）   |
| `keypoint_id` | INT    | 知识点 ID（外键） |

### 🧩 试卷表字段：`exams.auto_matched`
| 字段名        | 类型         | 描述                        |
|---------------|--------------|-----------------------------|
| `auto_matched`| BOOLEAN/TINYINT | 是否已完成 AI 自动匹配     |

---

## ✅ 6. 新增 API 接口（基于 mysql2 原始连接方式）

| 接口地址                           | 方法 | 描述                             |
|------------------------------------|------|----------------------------------|
| `/api/admin/questions`             | GET  | 获取所有题目                     |
| `/api/admin/keypoints`            | GET  | 获取所有知识点                   |
| `/api/admin/question-keypoints`   | GET  | 获取题目与知识点映射关系        |
| `/api/admin/question-keypoints`   | POST | 保存题目与知识点绑定关系        |

---

## ✅ 7. 学生练习新增功能：倒计时练习模式

### 📍 入口设置：
- 学生进入知识点练习页时，可选择：
  - 是否启用倒计时（开关）
  - 倒计时时长（单位：分钟）

### ⏱ 页面行为：
- 若启用倒计时：
  - 页面顶部显示实时剩余时间
  - 倒计时结束自动提交答卷或提醒提交

### 📊 后续分析用途：
- 可用于对比：计时 vs 非计时 的练习表现
- 可用于未来进度分析中添加练习用时维度

---

📦 本次版本为系统中首次引入 **AI 驱动+人工校正结合** 的知识点匹配方案，并扩展至学生个性化练习与分析功能，极大提升了题库组织效率和个性化教学体验。
