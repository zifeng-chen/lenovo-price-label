# 联想价格标签打印系统 V2.0

一个面向本地门店和办公场景的轻量商品管理与 A4 价格标签打印工具。系统提供商品新增、编辑、删除、品类筛选、搜索和打印队列功能，所有业务数据实时保存到本机 SQLite 文件中。

项目采用单体部署方式：生产环境由一个 Node.js 进程同时提供 Vue 静态页面和 HTTP API，仅监听本机 `127.0.0.1:8890`。不需要安装 MySQL、Redis、Python、Docker 或 Nginx。

## 功能概览

- 商品新增、编辑和删除，操作后立即写入 SQLite
- 商品名称最长 100 个字符，价格支持最多两位小数且不能为负数
- 默认提供背包、键鼠、耳机、充电器、支架、电脑配件、音响、打印机 8 个品类
- 自动保留上一次录入商品时选择的品类
- 按品类即时筛选，无需重新请求服务器
- 按商品名称、品类或价格进行前端搜索
- 表头全选仅作用于当前筛选结果
- 打印队列最多选择 27 个商品
- A4 纵向单页打印，每页 3 列 × 9 行
- 商品名称保持单行，并根据长度自动调整字号
- 网页页眉和价格标签共用本地 SVG 联想标识
- 无用户登录、无云服务依赖，数据仅保存在当前电脑

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | Vue 3、JavaScript、HTML、CSS |
| 构建 | Vite 7 |
| 后端 | Node.js、Express 5 |
| 数据库 | SQLite、better-sqlite3 |
| 打印 | 浏览器原生 `window.print()`、CSS `@media print` |
| 生产端口 | `8890` |

## 系统架构

```text
浏览器
  │
  ├── Vue 3 管理界面
  │       │
  │       └── HTTP /api/*
  │                │
  └────────────────▼
            Node.js + Express
              │           │
              │           └── dist/ 前端静态文件
              │
              └── data/database.db
                     SQLite
```

开发模式下，Vite 使用 `5173`，并将 `/api` 代理到 `127.0.0.1:8890`。生产模式下只需要 Express 的 `8890` 端口。

## 项目结构

```text
lenovo-price-label/
├── server/
│   ├── index.js                 # Express 入口、静态文件和品类 API
│   ├── database.js              # SQLite 初始化、建表和默认品类
│   └── routes/
│       └── products.js          # 商品 CRUD API
├── src/
│   ├── components/
│   │   ├── CategoryTabs.vue     # 品类筛选
│   │   ├── PrintPanel.vue       # 打印队列与标签页面
│   │   ├── ProductForm.vue      # 商品新增和编辑
│   │   └── ProductList.vue      # 商品列表与当前结果全选
│   ├── views/
│   │   └── Home.vue             # 主页面和状态管理
│   ├── App.vue
│   ├── main.js
│   └── style.css                # 页面和打印样式
├── public/
│   └── lenovo-logo.svg          # 网页与标签共用的本地 SVG
├── data/
│   └── database.db              # 首次运行后自动生成，不提交 Git
├── dist/                        # npm run build 生成，不提交 Git
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

`node_modules/`、`dist/`、SQLite 数据库和 WAL 文件均已加入 `.gitignore`。

## 环境要求

### 必需环境

- macOS、Linux 或 Windows
- Node.js `22.12.0` 或更高版本
- npm（随 Node.js 安装）
- 支持 A4 打印的浏览器，推荐最新版 Google Chrome
- 如需实体打印，需要支持 A4 纵向打印的打印机

项目的 `.nvmrc` 当前固定为 Node.js `22.21.1`。使用 nvm 时执行：

```bash
nvm install
nvm use
node --version
npm --version
```

如果不使用 nvm，请确认 `node --version` 满足 `package.json` 中的 `engines.node` 要求。

## 获取项目

仓库地址：

```text
https://github.com/zifeng-chen/lenovo-price-label
```

克隆并进入项目目录：

```bash
git clone https://github.com/zifeng-chen/lenovo-price-label.git
cd lenovo-price-label
nvm use
npm ci
```

仓库为私有仓库时，需要先完成 GitHub 身份验证。

## 开发环境运行

```bash
npm run dev
```

该命令同时启动：

- Vite 开发服务器：`http://localhost:5173`
- Express API：`http://localhost:8890`

开发时请访问：

```text
http://localhost:5173
```

Vite 会将所有 `/api` 请求代理到 Express。`server/index.js` 使用 Node.js watch 模式，修改后端文件后会自动重启后端进程。

停止开发服务时，在运行命令的终端按 `Control + C`。

## 生产环境部署

本项目定位为单机本地部署。生产环境只运行一个 Node.js 服务，并只监听本机回环地址。

### 1. 安装固定依赖

```bash
nvm use
npm ci
```

### 2. 构建前端

```bash
npm run build
```

构建结果写入 `dist/`。每次修改 Vue、CSS、HTML 或 Logo 后，都需要重新执行构建。

### 3. 启动生产服务

```bash
npm start
```

启动成功后会显示：

```text
联想价格标签打印系统已启动：http://localhost:8890
```

浏览器访问：

```text
http://localhost:8890
```

### 4. 检查服务

```bash
curl http://127.0.0.1:8890/api/categories
```

正常情况下会返回品类 JSON 数组。

### 5. 停止和重启

- 前台运行时按 `Control + C` 停止服务
- 修改前端后：重新执行 `npm run build`，然后重启 `npm start`
- 修改后端后：直接重启 `npm start`
- 关闭运行服务的终端会结束进程

如需开机自启动，应使用操作系统自带的服务管理器，并确保启动命令使用 Node.js 22 的绝对路径。本项目不内置 PM2、Docker 或系统服务配置。

## 使用说明

### 添加商品

1. 输入商品名称
2. 选择品类
3. 输入价格
4. 点击“添加商品”

保存成功后商品会立即写入 SQLite。表单会保留上一次使用的品类，方便连续录入同类商品。

### 编辑和删除

- 点击商品行中的“编辑”，修改后点击“保存修改”
- 点击“删除”后需要确认，删除操作不可撤销
- 新增、编辑和删除成功后都不需要手动保存数据库

### 品类筛选和搜索

- 点击品类标签可立即筛选当前内存中的商品
- 点击“全部”恢复全部商品
- 搜索框支持商品名称、品类和价格
- 表头复选框只会选择当前筛选结果，不会选择被筛选隐藏的商品

### 打印价格标签

1. 勾选需要打印的商品
2. 最多选择 27 个商品
3. 点击“打印价格标签（数量）”
4. 在浏览器打印对话框确认纸张和缩放设置
5. 正式打印前建议先打印一张进行物理尺寸校准

清空打印队列不会删除商品数据。

## 打印规格

| 项目 | 当前设置 |
| --- | --- |
| 纸张 | A4，210mm × 297mm，纵向 |
| 每页数量 | 最多 27 个 |
| 布局 | 3 列 × 9 行 |
| 标签尺寸 | 66mm × 28mm |
| 打印网格 | 202mm × 276mm |
| A4 左右留白 | 各 4mm |
| 第一排顶部距离 | 15mm |
| 最后一排底部距离 | 约 6mm |
| 标签横向间距 | 2mm |
| 标签纵向间距 | 3mm |
| 标签边框 | `0.5pt solid #000` |
| Logo | 左对齐，本地 SVG |
| 价格颜色 | `#E2001A` |
| 价格字号 | 8mm |

打印网格通过 `translateY(15mm)` 在打印渲染阶段整体下移，并限制打印根容器高度，避免浏览器毫米换算舍入产生空白第二页。

浏览器打印设置必须选择：

- 纸张：A4
- 方向：纵向
- 缩放：100%
- 边距：无
- 页眉和页脚：关闭
- 背景图形：建议开启，以确保颜色按设计输出

如果浏览器仍显示旧样式，请先按 `Command + Shift + R`（macOS）或 `Control + F5`（Windows/Linux）强制刷新后重新打开打印预览。

不同打印机存在不可打印边缘和硬件缩放差异，批量打印前应使用直尺测量测试页。不要在打印机驱动中再次选择“适合页面”或其他自动缩放选项。

## 数据库和数据持久化

数据库文件：

```text
data/database.db
```

首次启动自动创建目录、数据库和表。SQLite 启用了：

- WAL 日志模式
- 外键约束
- 商品品类索引
- 商品更新时间索引

### 默认品类

```text
背包
键鼠
耳机
充电器
支架
电脑配件
音响
打印机
```

默认品类使用 `INSERT OR IGNORE` 初始化，不会覆盖已有数据。

### 数据表

`categories`：

| 字段 | 说明 |
| --- | --- |
| `id` | 自增主键 |
| `name` | 唯一品类名称 |
| `sort_order` | 显示顺序 |

`products`：

| 字段 | 说明 |
| --- | --- |
| `id` | 自增主键 |
| `name` | 商品名称，不能为空 |
| `category` | 品类名称，关联 `categories.name` |
| `price` | 非负价格 |
| `created_at` | 创建时间，ISO 8601 |
| `updated_at` | 更新时间，ISO 8601 |

## 数据备份和恢复

SQLite 数据库、`-wal` 和 `-shm` 文件不会提交到 GitHub。代码推送不能替代数据备份。

### 安全备份

建议先停止服务，再复制主数据库文件：

```bash
mkdir -p ~/lenovo-price-label-backups
cp data/database.db ~/lenovo-price-label-backups/database-$(date +%Y%m%d-%H%M%S).db
```

停止服务后复制可避免备份时 WAL 中仍有未合并事务。

### 恢复备份

恢复前必须停止服务，并先保留当前数据库副本：

```bash
cp data/database.db data/database.before-restore.db
cp ~/lenovo-price-label-backups/需要恢复的文件.db data/database.db
npm start
```

恢复会替换当前商品和品类数据，请确认备份文件后再执行。

### 添加新商品品类

当前界面提供品类读取，但没有品类新增按钮。如需添加品类，可以使用 SQLite 管理工具，或在安装了 `sqlite3` 命令行工具时执行：

```bash
sqlite3 data/database.db "INSERT INTO categories (name, sort_order) SELECT '显示器', COALESCE(MAX(sort_order), 0) + 1 FROM categories;"
```

建议停止服务后操作数据库，完成后重新启动并刷新页面。品类名称必须唯一。

## HTTP API

所有 API 都使用 JSON。生产地址前缀为：

```text
http://127.0.0.1:8890/api
```

| 方法 | 路径 | 说明 | 成功状态 |
| --- | --- | --- | --- |
| GET | `/api/categories` | 获取全部品类 | 200 |
| GET | `/api/products` | 获取全部商品 | 200 |
| POST | `/api/products` | 新增商品 | 201 |
| PUT | `/api/products/:id` | 修改商品 | 200 |
| DELETE | `/api/products/:id` | 删除商品 | 204 |

### 新增商品示例

```bash
curl -X POST http://127.0.0.1:8890/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"联想无线鼠标","category":"键鼠","price":99}'
```

### 修改商品示例

```bash
curl -X PUT http://127.0.0.1:8890/api/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"联想无线鼠标 Plus","category":"键鼠","price":129}'
```

### 删除商品示例

```bash
curl -X DELETE http://127.0.0.1:8890/api/products/1
```

API 会校验商品名称、品类和价格。错误响应格式：

```json
{
  "message": "错误说明"
}
```

## 日常维护

### 更新代码并重新部署

更新前先备份数据库，然后执行：

```bash
git pull --ff-only
nvm use
npm ci
npm run build
npm start
```

执行新的 `npm start` 前，需要先停止旧进程，避免 `8890` 端口被占用。

### 依赖安全检查

```bash
npm audit
npm outdated
```

依赖在 `package.json` 中使用精确版本，并由 `package-lock.json` 锁定。不要在没有备份和构建验证的情况下直接执行强制依赖升级。

### 修改代码后的检查

```bash
npm run build
```

构建成功后，再重启生产服务并检查：

```bash
curl http://127.0.0.1:8890/api/products
```

打印 CSS 修改后，还应在 Chrome 中检查实际打印预览，并确认只有一页、尺寸和边距正确。

### 日志

服务日志直接输出到启动 `npm start` 的终端，包括启动地址和未处理的服务器错误。项目当前不包含日志轮转服务；长期运行时应由操作系统服务管理器负责保存和轮转标准输出。

## 故障排查

### Node.js 版本不兼容

现象：Vite、Express 或 better-sqlite3 安装/启动失败。

```bash
nvm install
nvm use
node --version
npm ci
```

确保 Node.js 不低于 `22.12.0`。

### 8890 端口被占用

```bash
lsof -nP -iTCP:8890 -sTCP:LISTEN
```

先确认占用端口的进程，再正常停止该进程。服务端口当前固定为 `8890`。

### 生产页面打不开

确认已生成 `dist/`：

```bash
npm run build
npm start
```

然后检查：

```bash
curl http://127.0.0.1:8890/
```

### 数据库无法打开

- 确认项目目录可写
- 确认 `data/` 没有被设置为只读
- 确认磁盘空间充足
- 不要同时用会锁定数据库的外部编辑器长期占用文件
- 从已验证的备份恢复前先停止服务

### 打印预览仍是旧布局

1. 关闭当前打印预览
2. 强制刷新网页
3. 重新选择商品
4. 再次点击打印
5. 检查缩放是否为 100%、边距是否为无、页眉页脚是否关闭

### 打印出现第二页

- 确认最多只选择 27 个商品
- 确认纸张为 A4 纵向
- 确认缩放为 100%
- 关闭浏览器页眉和页脚
- 不要启用打印机驱动的额外缩放

## 安全与使用范围

- 服务只绑定 `127.0.0.1`，默认仅当前电脑可访问
- 系统没有用户认证、权限控制、HTTPS 和请求频率限制
- 不要直接将服务修改为监听 `0.0.0.0` 并暴露到局域网或互联网
- 如需多人访问，应先增加身份认证、HTTPS、访问控制和备份策略
- 商品数据和数据库备份可能包含业务信息，应限制文件访问权限

## Logo 和商标说明

网页页眉与价格标签使用 `public/lenovo-logo.svg` 中的本地矢量标识。Lenovo 名称和标识是 Lenovo 的商标；本项目中的使用不表示 Lenovo 对本项目的认可或提供支持。

## 维护检查清单

每次发布或更新时建议依次确认：

- [ ] 已备份 `data/database.db`
- [ ] Node.js 版本符合要求
- [ ] `npm ci` 成功
- [ ] `npm audit` 无未处理的高风险问题
- [ ] `npm run build` 成功
- [ ] 首页可以通过 `http://localhost:8890` 打开
- [ ] 商品新增、编辑、删除正常
- [ ] 页面刷新后商品数据仍存在
- [ ] 打印预览只有一页
- [ ] 标签边框、间距、Logo 和价格位置正确
- [ ] Git 工作区没有误提交数据库或构建产物
