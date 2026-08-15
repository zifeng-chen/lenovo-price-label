# 联想价格标签打印系统 V2.0

本地运行的轻量商品管理与 A4 价格标签打印工具。前端使用 Vue 3 + Vite，后端使用 Node.js + Express，数据实时写入本地 SQLite 文件。生产环境由一个 Node 服务同时提供页面和 API，仅监听 `127.0.0.1:8890`。

## 环境要求

- macOS、Linux 或 Windows
- Node.js `22.12.0` 或更高版本（项目提供 `.nvmrc`）
- 打印机支持 A4 纵向打印

使用 nvm 时：

```bash
nvm install
nvm use
```

## 安装和运行

```bash
npm install
```

开发模式（Vite `5173` + API `8890`）：

```bash
npm run dev
```

生产模式（最终仅使用 `8890`）：

```bash
npm run build
npm start
```

访问 <http://localhost:8890>。

## 数据存储

首次启动会自动创建 `data/database.db`，并初始化以下品类：背包、键鼠、耳机、充电器、支架、电脑配件、音响、打印机。商品的新增、编辑和删除操作会立即写入 SQLite；请定期备份 `data/database.db`。

## 打印设置

打印实现采用固定 `68mm × 28mm` 标签、每页 3 列 × 9 行，共 27 个。三列标签总宽度为 204mm，A4 页面左右各留 3mm；纵向间距为 3mm，上下各留 10.5mm，因此标签不会贴到纸张的任何边缘。标签之间使用统一的 `0.5pt` 裁切边框分隔。

浏览器打印对话框请设置：

- 纸张：A4
- 方向：纵向
- 缩放：100%
- 边距：无（页面留白已由打印 CSS 精确控制）
- 页眉和页脚：关闭

不同打印机可能存在不可打印边缘，正式批量打印前请先打印一张并用尺校准。

## API

- `GET /api/categories`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## Logo

标签使用 `public/lenovo-logo.svg` 中的本地 SVG 矢量标识，并在打印标签左侧显示。Lenovo 名称和标识是 Lenovo 的商标，本项目中的使用不表示 Lenovo 对本项目的认可。
