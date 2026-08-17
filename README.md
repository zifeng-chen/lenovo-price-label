# 联想价格标签打印系统 V2.0

一个面向门店和办公局域网的轻量商品管理与 A4 价格标签打印系统。系统支持商品录入、编辑、删除、品类筛选、搜索和打印队列，业务数据实时保存到运行服务的电脑本地 SQLite 数据库。

生产环境由一个 Node.js 进程同时提供 Vue 页面和 HTTP API，监听 `0.0.0.0:8890`。同一局域网中的电脑、平板和手机可以通过服务器的局域网 IP 访问。项目不依赖 MySQL、Redis、Python、Docker、Nginx或云服务。

> 安全提示：系统没有登录、权限控制和 HTTPS。开放到局域网后，能够访问 8890 端口的设备都可以读取、导出、新增、修改、删除或全量替换业务数据。请只在可信局域网使用，并通过系统防火墙限制访问范围，禁止映射到公网。

## 功能概览

- 商品新增、编辑和删除，操作后立即写入 SQLite
- 商品名称最长 100 个字符，价格不能为负数并保留最多两位小数
- 默认提供背包、键鼠、耳机、充电器、支架、电脑配件、音响、打印机 8 个品类
- 自动保留上一次录入商品时选择的品类
- 按品类、商品名称或价格即时筛选
- 表头全选仅作用于当前筛选结果
- 打印勾选数量不受限制，每 28 个商品自动增加一张 A4
- A4 横向分页打印，每页 4 列 × 7 行
- 页面内提供分页打印预览弹窗，可核对标签内容后直接打印
- 支持完整 JSON 数据导出、导入前校验和确认后事务恢复
- 标签尺寸固定为 70mm × 28mm
- Logo 和价格位于标签顶部同一行，商品名称独占底部整行
- 网页页眉和价格标签共用本地 SVG 联想标识
- 生产页面和 API 均支持局域网访问

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | Vue 3、JavaScript、HTML、CSS |
| 构建 | Vite 7 |
| 后端 | Node.js、Express 5 |
| 数据库 | SQLite、better-sqlite3 |
| 打印 | 浏览器原生 `window.print()`、CSS `@media print` |
| 生产监听 | `0.0.0.0:8890` |

## 系统架构

```text
局域网浏览器
  │
  ├── Vue 3 管理页面
  │       │
  │       └── HTTP /api/*
  │                │
  └────────────────▼
       Node.js + Express（0.0.0.0:8890）
              │           │
              │           └── dist/ 前端静态文件
              │
              └── data/database.db
                     SQLite
```

开发模式下，Vite 监听 `0.0.0.0:5173`，并在服务器内部将 `/api` 代理到 `127.0.0.1:8890`。生产模式只需要 `8890` 端口。

## 项目结构

```text
lenovo-price-label/
├── server/
│   ├── index.js                 # Express 入口、局域网监听和静态文件
│   ├── database.js              # SQLite 初始快照复制、建表和连接
│   └── routes/
│       ├── categories.js        # 品类查询与新增 API
│       ├── data.js              # JSON 数据导出、校验与导入 API
│       └── products.js          # 商品 CRUD API
├── src/
│   ├── components/
│   │   ├── CategoryTabs.vue     # 品类筛选
│   │   ├── PrintPanel.vue       # 打印队列与标签 DOM
│   │   ├── ProductForm.vue      # 商品新增和编辑
│   │   └── ProductList.vue      # 商品列表与当前结果全选
│   ├── views/
│   │   └── Home.vue             # 主页面和状态管理
│   ├── App.vue
│   ├── main.js
│   └── style.css                # 页面和横向 A4 打印样式
├── public/
│   └── lenovo-logo.svg          # 网页与标签共用 SVG
├── data/
│   ├── initial-database.db      # 提交到 Git 的初始数据快照（8 品类、36 商品）
│   └── database.db              # 首次运行时从快照复制，运行数据不提交 Git
├── dist/                        # npm run build 生成，不提交 Git
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

`node_modules/`、`dist/`、运行数据库 `data/database.db`、本地备份和 WAL 文件均已加入 `.gitignore`。只有只读基线快照 `data/initial-database.db` 提交到 Git。

## 环境要求

- macOS、Linux 或 Windows
- Node.js `22.12.0` 或更高版本
- npm（随 Node.js 安装）
- 推荐最新版 Google Chrome
- 支持 A4 横向打印的打印机
- 局域网访问设备与服务器位于同一网络
- 服务器防火墙允许可信局域网访问 TCP `8890`

项目 `.nvmrc` 当前固定为 Node.js `22.21.1`：

```bash
nvm install
nvm use
node --version
npm --version
```

## 获取项目

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

- Vite 页面：`http://<服务器局域网IP>:5173`
- Express API：`http://<服务器局域网IP>:8890`

本机仍可访问 `http://localhost:5173`。Vite 的 `/api` 请求在服务器内部代理到 Express。停止开发服务时按 `Control + C`。

开发服务也对局域网开放，仅应在可信网络中运行。

## 生产环境部署

### 1. 安装固定依赖

```bash
nvm use
npm ci
```

### 2. 构建前端

```bash
npm run build
```

构建结果写入 `dist/`。修改 Vue、CSS、HTML 或 Logo 后必须重新构建。

### 3. 启动生产服务

```bash
npm start
```

服务绑定所有网络接口。启动日志会列出本机和检测到的局域网地址，例如：

```text
本机访问：http://localhost:8890
局域网访问：http://192.168.1.100:8890
```

### 4. 查询服务器局域网 IP

macOS 常用命令：

```bash
ipconfig getifaddr en0
```

Linux 常用命令：

```bash
hostname -I
```

Windows 在命令提示符执行：

```text
ipconfig
```

找到类似 `192.168.x.x`、`10.x.x.x` 或 `172.16.x.x` 到 `172.31.x.x` 的 IPv4 地址。局域网设备访问：

```text
http://服务器局域网IP:8890
```

例如：

```text
http://192.168.1.100:8890
```

### 5. 检查服务

在服务器本机执行：

```bash
curl http://localhost:8890/api/categories
```

在另一台局域网设备上，将 `localhost` 替换为服务器局域网 IP。

### 6. 防火墙

如果本机可以访问、其他设备无法访问，请确认：

- 服务器和客户端连接同一个局域网
- 路由器没有启用客户端隔离或访客网络隔离
- macOS、Windows 或 Linux 防火墙允许 Node.js 接收 TCP `8890`
- 没有把 `8890` 转发或暴露到公网

### 7. 停止和重启

- 前台运行时按 `Control + C` 停止
- 修改前端后：执行 `npm run build`，再重启 `npm start`
- 修改后端后：直接重启 `npm start`
- 关闭运行终端会结束服务

如需开机自启动，请使用操作系统服务管理器，并确保启动命令使用 Node.js 22 的绝对路径。本项目不内置 PM2、Docker 或系统服务配置。

## 使用说明

### 商品管理

1. 输入商品名称
2. 选择品类
3. 输入价格
4. 点击“添加商品”

保存成功后商品立即写入 SQLite。表单会保留上一次使用的品类。商品行提供编辑和删除操作，删除前需要确认。

### 筛选和搜索

- 点击品类标签即时筛选
- 点击“全部”恢复全部商品
- 搜索框支持商品名称、品类和价格
- 表头复选框只选择当前筛选结果

### 打印价格标签

1. 勾选需要打印的商品，数量不受限制
2. 点击“打印预览”，在弹窗中逐页核对标签内容和页数
3. 点击弹窗中的“确认打印”进入浏览器打印对话框；也可以点击底部“打印价格标签（数量）”跳过页面内预览
4. 系统按商品列表顺序每 28 个商品生成一张 A4
5. 在浏览器打印对话框选择 A4、横向、100%
6. 核对预览页数应为 `向上取整(商品数 ÷ 28)`
7. 正式打印前先打印测试页并测量物理尺寸

打印预览弹窗支持点击“关闭”或“返回修改”、点击弹窗外遮罩以及按 `Escape` 关闭。清空打印队列不会删除商品。

## 打印规格

| 项目 | 当前设置 |
| --- | --- |
| 纸张 | A4，297mm × 210mm，横向 |
| 选择总数 | 不限制 |
| 每页数量 | 最多 28 个，超出后自动分页 |
| 布局 | 每页 4 列 × 7 行 |
| 标签尺寸 | 70mm × 28mm |
| 打印网格 | 280mm × 196mm |
| A4 左右留白 | 自动居中，各 8.5mm |
| A4 上下留白 | 物理纸合计 14mm；在 209mm 打印页内各 6.5mm |
| 标签横向间距 | 0 |
| 标签纵向间距 | 0 |
| 标签边框 | `0.5pt solid #000` |
| 标签内边距 | 顶部和左右主要定位均为 2.5mm |
| Logo | 左上，宽 34mm |
| 价格 | 右上，与 Logo 顶部对齐，字号 8mm，字符间距 2px |
| 商品名称 | 底部独占整行，左右各 2.5mm；默认 5mm 字号，仅在实际宽度超出整行时缩小 |
| 价格颜色 | `#E2001A` |

几何计算：

```text
A4 纵向：3 × 70mm = 210mm，10 × 28mm = 280mm，可放 30 张，但左右无打印余量
A4 横向：4 × 70mm = 280mm，7 × 28mm = 196mm，可放 28 张，左右各余 8.5mm、上下合计余 14mm
```

最终采用横向 4 × 7。纵向虽然能多放 2 张，但 210mm 网格恰好占满纸宽，非无边距打印机或浏览器、驱动的尺寸换算可能裁切两侧边框；横向布局保留安全余量，更适合稳定批量打印。标签之间不留间距，相邻边框直接接触。

网格使用 `top: 50%`、`left: 50%` 和 `translate(-50%, -50%)` 在每张打印页中居中。

每个 `.print-page` 高度使用 `209mm`，比 A4 短边少 1mm，以降低浏览器换算舍入产生空白页的概率。第二页起强制换页，最后一页不会追加尾随空白页。

浏览器打印设置：

- 纸张：A4
- 方向：横向
- 缩放：100%
- 边距：无
- 页眉和页脚：关闭
- 背景图形：建议开启

如果仍显示旧布局，请关闭打印预览，按 `Command + Shift + R`（macOS）或 `Control + F5`（Windows/Linux）强制刷新，再重新选择商品打印。

不同打印机存在不可打印边缘和硬件缩放差异。不要在打印机驱动中再次启用“适合页面”等自动缩放，批量打印前必须测量测试页。

## 数据库和数据持久化

数据库文件：

```text
data/initial-database.db  # Git 中的初始快照
data/database.db          # 本机实际运行数据
```

首次启动且 `data/database.db` 不存在时，服务会把 `data/initial-database.db` 复制为运行数据库，再启用 WAL、外键约束并检查/创建表和索引。当前初始快照包含 8 个品类和 36 个商品。

已有 `data/database.db` 时绝不会被初始快照覆盖。若初始快照不存在，系统仍会创建空运行库并写入默认品类：背包、键鼠、耳机、充电器、支架、电脑配件、音响、打印机。

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
| `name` | 商品名称 |
| `category` | 关联 `categories.name` |
| `price` | 非负价格 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

## 数据备份和恢复

### 网页 JSON 备份

页面顶部“备份与恢复”区域提供两项操作：

- **导出数据**：下载包含格式版本、导出时间、完整品类和商品字段的 JSON 文件
- **导入数据**：选择不超过 5MB 的 JSON 备份，服务端先进行只读校验并显示品类/商品数量；用户确认后，才在单个 SQLite 事务中替换当前全部数据

导入失败会整体回滚，不会保留只导入一部分的数据。导入成功后，页面会清空打印选择、编辑状态和筛选条件，并重新读取数据库。

> 导入是全量恢复操作，会替换当前所有品类和商品。导入前应先导出当前数据，确认校验摘要无误后再继续。

### SQLite 文件备份

运行数据库 `data/database.db`、本地备份、`-wal` 和 `-shm` 文件不会提交到 GitHub。`data/initial-database.db` 只是首次部署基线，不会随日常商品修改自动更新，不能替代运行数据备份。

安全备份前先停止服务：

```bash
mkdir -p ~/lenovo-price-label-backups
cp data/database.db ~/lenovo-price-label-backups/database-$(date +%Y%m%d-%H%M%S).db
```

恢复前停止服务并保留当前文件：

```bash
cp data/database.db data/database.before-restore.db
cp ~/lenovo-price-label-backups/需要恢复的文件.db data/database.db
npm start
```

恢复会替换当前商品和品类数据。

### 恢复仓库初始数据

先停止服务并备份运行库，然后删除本机运行文件；下次启动会重新复制 `initial-database.db`：

```bash
cp data/database.db ~/lenovo-price-label-backups/database-before-reset.db
rm -f data/database.db data/database.db-wal data/database.db-shm
npm start
```

该操作会把运行数据恢复为仓库中的 8 个品类和 36 个商品。

### 添加品类

1. 在“添加新商品”区域找到“品类”字段
2. 点击“+ 新增品类”
3. 输入最多 30 个字符的品类名称
4. 点击“保存品类”

品类会立即写入 SQLite、加入筛选标签和商品品类下拉框，并自动成为当前表单选择。品类名称必须唯一；“全部”是系统筛选项，不能作为品类名称。

## HTTP API

生产环境 API：

```text
http://服务器局域网IP:8890/api
```

| 方法 | 路径 | 说明 | 成功状态 |
| --- | --- | --- | --- |
| GET | `/api/data/export` | 导出完整 JSON 备份 | 200 |
| POST | `/api/data/import` | 校验或导入完整 JSON 备份 | 200 |
| GET | `/api/categories` | 获取全部品类 | 200 |
| POST | `/api/categories` | 新增品类 | 201 |
| GET | `/api/products` | 获取全部商品 | 200 |
| POST | `/api/products` | 新增商品 | 201 |
| PUT | `/api/products/:id` | 修改商品 | 200 |
| DELETE | `/api/products/:id` | 删除商品 | 204 |

导入接口请求格式：

```json
{
  "validateOnly": true,
  "data": {
    "schemaVersion": 1,
    "exportedAt": "2026-01-01T00:00:00.000Z",
    "categories": [],
    "products": []
  }
}
```

网页会先以 `validateOnly: true` 校验；用户确认后再用同一份数据提交 `validateOnly: false`。备份至少需要一个有效品类，实际导出文件会包含所有完整字段。

服务器本机新增商品示例：

```bash
curl -X POST http://localhost:8890/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"联想无线鼠标","category":"键鼠","price":99}'
```

修改和删除：

```bash
curl -X PUT http://localhost:8890/api/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"联想无线鼠标 Plus","category":"键鼠","price":129}'

curl -X DELETE http://localhost:8890/api/products/1
```

错误响应格式：

```json
{
  "message": "错误说明"
}
```

## 日常维护

### 更新代码并重新部署

先备份数据库并停止旧服务：

```bash
git pull --ff-only
nvm use
npm ci
npm run build
npm start
```

### 检查依赖

```bash
npm audit
npm outdated
```

依赖使用精确版本并由 `package-lock.json` 锁定。不要在没有备份和构建验证的情况下强制升级。

### 修改后检查

```bash
npm run build
curl http://localhost:8890/api/products
```

打印 CSS 修改后，应检查 Chrome 打印预览和实体测试页。网络修改后，应从另一台局域网设备访问首页和 API。

### 日志

服务日志输出到运行 `npm start` 的终端，包括本机地址、局域网地址和服务器错误。项目不包含日志轮转；长期运行时应由系统服务管理器处理标准输出。

## 故障排查

### Node.js 版本错误

```bash
nvm install
nvm use
npm ci
```

确保 Node.js 不低于 `22.12.0`。

### 8890 端口被占用

```bash
lsof -nP -iTCP:8890 -sTCP:LISTEN
```

确认进程后正常停止旧服务。

### 局域网设备无法访问

1. 在服务器本机打开 `http://localhost:8890`
2. 查看 `npm start` 输出的“局域网访问”地址
3. 确认客户端和服务器处于同一网段
4. 检查防火墙是否允许 Node.js 和 TCP 8890
5. 检查路由器是否启用 AP/客户端隔离
6. 确认访问的是服务器当前 IPv4 地址

### 生产页面打不开

```bash
npm run build
npm start
curl http://localhost:8890/
```

### 浏览器打印预览仍是旧布局

1. 关闭打印预览
2. 强制刷新网页
3. 重新选择商品
4. 再次点击打印
5. 确认 A4、横向、100%、无边距、关闭页眉页脚

### 打印页数或分页异常

- 正常页数为 `向上取整(所选商品数 ÷ 28)`
- 确认 A4 横向
- 确认缩放为 100%
- 关闭页眉页脚
- 禁止打印机驱动额外缩放
- 如果出现额外空白页，请关闭预览、强制刷新网页后重试

### 数据库无法打开

- 确认项目和 `data/` 可写
- 确认磁盘空间充足
- 不要让外部工具长期锁定数据库
- 恢复备份前先停止服务

## 安全与使用范围

- 服务当前监听 `0.0.0.0:8890`，局域网设备可访问
- 开发服务器也监听 `0.0.0.0:5173`
- 系统没有用户认证、权限控制、HTTPS、CSRF 防护和请求频率限制
- 同网段用户可以调用写入 API 修改商品、品类，导出数据或替换全部数据库内容
- 仅允许可信局域网访问，并使用主机防火墙限制 8890
- 禁止将 8890 或 5173 端口转发到公网
- 不应在公共 Wi-Fi、访客网络或不受信任网络运行
- 数据库和备份可能包含业务信息，应限制文件权限

## Logo 和商标说明

网页页眉与标签使用 `public/lenovo-logo.svg`。Lenovo 名称和标识是 Lenovo 的商标；本项目中的使用不表示 Lenovo 对本项目的认可或支持。

## 发布维护检查清单

- [ ] 已备份 `data/database.db`
- [ ] Node.js 版本符合要求
- [ ] `npm ci` 和 `npm audit` 成功
- [ ] `npm run build` 成功
- [ ] 本机可以访问 `http://localhost:8890`
- [ ] 另一台局域网设备可以访问页面和 API
- [ ] 防火墙只允许可信局域网访问 8890
- [ ] 商品新增、编辑、删除和刷新持久化正常
- [ ] JSON 数据可以成功导出，导入取消确认时数据库不变化
- [ ] JSON 校验能显示正确品类和商品数量，确认导入后页面状态正确刷新
- [ ] 打印队列可以选择任意数量商品
- [ ] “打印预览”弹窗按 28 张分页，页数和标签内容正确
- [ ] 预览弹窗可通过按钮、外部遮罩和 `Escape` 关闭，Tab 焦点不会进入背景页面，弹窗内“确认打印”可进入浏览器打印
- [ ] 每 28 个标签自动增加一张 A4，页数为 `向上取整(数量 ÷ 28)`
- [ ] 满页 28 张标签均完整显示，最后一页后没有额外空白页
- [ ] 实体标签测量为 70mm × 28mm
- [ ] 标签横向和纵向间距均为 0，相邻边框符合裁切要求
- [ ] Logo 与价格同处顶部，商品名称独占底行
- [ ] Git 仅提交 `data/initial-database.db`，未提交运行库、备份、WAL 和构建产物
