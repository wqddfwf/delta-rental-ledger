# 三角洲行动帐号出租记账系统

这是一个可部署到 GitHub Pages 的纯静态网页系统，包含：

- 帐号库存管理：帐号ID、游戏名称、状态、累计收益、编辑、删除
- 出租订单管理：订单ID、游戏名称、租客、价格、哈夫币数量、出租天数、实收金额、押金、纯利润、状态、编辑、删除
- 租客管理：租客名称、租赁次数、消费金额、新客/回头客程度标记、编辑、删除
- GitHub 云端同步：通过 GitHub Contents API 读写 `data/ledger-data.json`

## 部署到 GitHub Pages

1. 新建一个 GitHub 仓库，例如 `delta-rental-ledger`。
2. 把本文件夹内的所有文件上传到仓库根目录。
3. 打开仓库 `Settings` -> `Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. 分支选择 `main`，目录选择 `/root`，保存。
6. 等待 GitHub Pages 发布后访问页面。

## GitHub 云端数据保存

网页左侧菜单的 `GitHub 云端` 页面需要填写：

- GitHub 用户名 / 组织
- 仓库名
- 分支，默认 `main`
- 数据文件路径，默认 `data/ledger-data.json`
- Fine-grained Token

Token 建议使用 Fine-grained personal access token，只给这个仓库授权，并开启 `Contents: Read and write`。网页会把 Token 保存在当前浏览器的 localStorage 中，适合个人自用设备。

## 本地使用

直接打开 `index.html` 即可使用。数据会自动保存到浏览器 localStorage，也可以手动导出和导入 JSON。
