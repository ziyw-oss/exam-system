# 👤 用户系统功能设计文档（注册 + 登录 + 身份权限）

本用户系统将作为 Exam Practice System 的基础模块，支持学生和教师用户进行注册、登录、权限识别，并在考试与练习过程中完成身份绑定。

---

## ✅ 1. 功能目标概览

| 功能模块     | 路径                    | 描述                                               |
|--------------|-------------------------|----------------------------------------------------|
| 用户注册      | `/register`             | 创建新账户，输入用户名、邮箱、密码，选择角色（学生/教师） |
| 用户登录      | `/login`                | 输入邮箱/密码登录，获取身份令牌                    |
| 用户身份      | `users.role`            | 区分 `student`, `teacher`, `admin`                |
| 权限保护页面  | 仅登录用户可访问某些页面 | 例如 `/dashboard`, `/exam/start`                  |
| 会话持久化    | JWT 或 Cookie + Token    | 存储用户登录状态，刷新页面不丢失                  |

---

## ✅ 2. 数据库设计

### 📄 表名：`users`

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- 所有密码使用 `bcrypt` 加密存储
- 用户类型使用枚举字段控制权限（学生、教师、管理员）

---

## ✅ 3. 前端页面设计

| 页面路径      | 功能说明                     |
|---------------|------------------------------|
| `/register`   | 表单：姓名、邮箱、密码、角色选择 |
| `/login`      | 表单：邮箱、密码             |
| `/dashboard`  | 登录成功跳转页面             |

- 表单支持输入校验（邮箱格式、密码强度）
- 登录成功使用 Cookie 存储 token，支持自动登录

---

## ✅ 4. 后端 API 接口设计

### 📌 注册接口

- `POST /api/auth/register`

```json
请求体:
{ "name": "Alice", "email": "a@b.com", "password": "123456", "role": "student" }

响应:
{ "success": true, "message": "注册成功" }
```

---

### 📌 登录接口

- `POST /api/auth/login`

```json
请求体:
{ "email": "a@b.com", "password": "123456" }

响应:
{ "token": "JWT_TOKEN", "user": { "id": 1, "name": "Alice", "role": "student" } }
```

---

## ✅ 5. 身份认证机制

- 使用 JWT + HttpOnly Cookie 作为认证方式
- 登录后响应设置 cookie，后续请求自动携带
- 页面中间件判断是否登录、是否具有访问权限

---

## ✅ 6. 页面权限控制

| 页面                  | 访问权限         |
|-----------------------|------------------|
| `/dashboard`          | 登录用户         |
| `/admin/*`            | `role === 'teacher' || 'admin'` |
| `/practice`           | `role === 'student'` |

---

## ✅ 7. 用户绑定机制（为后续模块服务）

- 所有考试记录、练习记录、错题本等数据表需新增字段：`user_id`
- 自动从当前登录用户中提取 `req.user.id` 绑定数据

---

📦 用户系统是整个系统的访问入口和数据归属基础，建议尽早集成，并优先构建注册 / 登录 / 权限保护路径。
