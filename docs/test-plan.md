# MindLedger MVP 端到端测试计划

## 目录
1. [环境配置](#1-环境配置)
2. [服务启动](#2-服务启动)
3. [API 测试](#3-api-测试)
4. [前端功能测试](#4-前端功能测试)
5. [测试用例详情](#5-测试用例详情)

---

## 1. 环境配置

### 1.1 环境变量配置

在 `mind-ledger/backend/.env` 文件中配置以下环境变量：

```env
MINIMAX_API_KEY=你的MiniMax API密钥
MINIMAX_GROUP_ID=你的MiniMax Group ID
PORT=3000
```

**配置说明：**
- `MINIMAX_API_KEY`: MiniMax API 密钥，用于调用 LLM 服务获取会议总结和智能问答
  - 如需使用真实 API，请在 [MiniMax 开放平台](https://platform.minimaxi.com/) 申请 API Key
  - **注意**: 如果留空，系统将使用模拟数据进行测试
- `MINIMAX_GROUP_ID`: MiniMax Group ID，用于指定 API 调用组
  - 留空时使用默认配置
- `PORT`: 后端服务端口，默认为 3000

### 1.2 环境变量模板

参考 `mind-ledger/backend/.env.example`：

```env
# MiniMax API 配置
MINIMAX_API_KEY=
MINIMAX_GROUP_ID=

# 服务器配置
PORT=3000
```

---

## 2. 服务启动

### 2.1 启动后端服务

```bash
cd mind-ledger/backend
node index.js
```

**预期输出：**
```
Server is running on http://localhost:3000
```

### 2.2 启动前端服务

```bash
cd mind-ledger/frontend
npm run dev
```

**预期输出：**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 2.3 服务地址

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:3000 |
| 前端页面 | http://localhost:5173 |

---

## 3. API 测试

### 3.1 运行内置测试脚本

```bash
cd mind-ledger/backend
node test-api.js
```

**预期输出：**
```
--- Testing Create Meeting ---
--- Testing List Meetings ---
--- Testing Get Meeting Detail ---
--- Testing Chat ---
✅ All tests passed!
```

### 3.2 API 端点列表

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /meetings | 获取所有会议列表 |
| POST | /meetings | 创建新会议 |
| GET | /meetings/:id | 获取会议详情 |
| POST | /chat | 智能问答 |

---

## 4. 前端功能测试

### 4.1 功能模块

| 模块 | 路径 | 功能 |
|------|------|------|
| 首页 | / | 展示会议列表 |
| 创建会议 | /meeting | 输入会议标题和内容 |
| 会议详情 | /meeting/:id | 查看会议总结和详情 |
| 智能问答 | /chat | 与会议内容对话 |

### 4.2 测试流程

1. **首页测试**
   - 访问 http://localhost:5173/
   - 验证会议列表正常显示
   - 验证"新建会议"按钮可用

2. **创建会议测试**
   - 点击"新建会议"按钮
   - 输入会议标题和内容
   - 点击提交，验证创建成功

3. **会议详情测试**
   - 点击会议列表中的某个会议
   - 验证会议详情页显示
   - 验证 AI 总结内容正常显示

4. **智能问答测试**
   - 进入问答页面
   - 选择会议或查看所有会议
   - 输入问题并发送
   - 验证 AI 回答正常显示

---

## 5. 测试用例详情

### 5.1 创建会议 (POST /meetings)

**请求：**
```bash
curl -X POST http://localhost:3000/meetings \
  -H "Content-Type: application/json" \
  -d '{"title": "测试会议", "content": "这是会议内容"}'
```

**预期响应：**
```json
{
  "id": "uuid",
  "title": "测试会议",
  "content": "这是会议内容",
  "summary": "AI生成的会议总结",
  "actionItems": ["待办事项1", "待办事项2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 5.2 获取会议列表 (GET /meetings)

**请求：**
```bash
curl http://localhost:3000/meetings
```

**预期响应：**
```json
[
  {
    "id": "uuid",
    "title": "测试会议",
    "summary": "AI生成的会议总结",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 5.3 获取会议详情 (GET /meetings/:id)

**请求：**
```bash
curl http://localhost:3000/meetings/{会议ID}
```

**预期响应：**
```json
{
  "id": "uuid",
  "title": "测试会议",
  "content": "这是会议内容",
  "summary": "AI生成的会议总结",
  "actionItems": ["待办事项1", "待办事项2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 5.4 智能问答 (POST /chat)

**请求：**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "会议的待办事项是什么?", "meetingId": "会议ID"}'
```

**预期响应：**
```json
{
  "answer": "AI生成的回答内容"
}
```

---

## 6. 故障排查

### 6.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 后端无法启动 | 端口被占用 | 检查 PORT 配置，关闭占用进程 |
| 前端无法连接后端 | CORS 问题 | 检查后端 CORS 配置 |
| API 请求失败 | 服务未启动 | 确认后端服务运行在 localhost:3000 |
| AI 功能无响应 | API Key 未配置 | 配置 MINIMAX_API_KEY 或使用模拟数据 |

### 6.2 检查服务状态

```bash
# 检查后端服务
curl http://localhost:3000/meetings

# 检查前端服务
curl http://localhost:5173
```

---

## 7. 测试检查清单

- [ ] 环境变量已配置
- [ ] 后端服务已启动 (localhost:3000)
- [ ] 前端服务已启动 (localhost:5173)
- [ ] API 测试脚本运行通过
- [ ] 首页可正常访问
- [ ] 创建会议功能正常
- [ ] 会议详情显示正常
- [ ] 智能问答功能正常

---

**文档版本:** 1.0
**最后更新:** 2024
