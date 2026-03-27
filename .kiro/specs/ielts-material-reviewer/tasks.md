# 实现计划：IELTS Material Reviewer

## 概述

基于前后端分离架构，按"项目初始化 → 后端数据层 → 后端 API → 前端基础框架 → 各功能页面 → 复习模式 → 集成联调"的顺序逐步实现。每个任务构建在前一个任务之上，确保无孤立代码。

## 任务

- [x] 1. 项目初始化与基础配置
  - [x] 1.1 初始化项目结构和依赖
    - 创建 monorepo 结构：`client/`（React + TypeScript + Vite）和 `server/`（Node.js + Express + TypeScript）
    - 安装核心依赖：react, react-router-dom, tailwindcss, express, better-sqlite3, openai, vitest, fast-check, supertest
    - 配置 Tailwind CSS 主题（暖色羊皮纸底色 `#F4F2EF`、海军蓝 `#384F84`、金色 `#C8B496`、零圆角零阴影）
    - 配置 Google Fonts：Playfair Display、IBM Plex Mono、Geist
    - 配置 Vitest 测试环境
    - _需求: 7.1_

  - [x] 1.2 定义共享类型和接口
    - 在 `shared/types.ts` 中定义所有 TypeScript 类型：SourceTag, ExtractionType, BandLevel, Priority, MasteryStatus, ParseStatus, Material, Extraction, VocabularyData, CollocationData, SentenceData, UserSettings 等
    - _需求: 2.2, 2.3, 2.4, 6.1_

- [x] 2. 后端数据层
  - [x] 2.1 实现 SQLite 数据库初始化和迁移
    - 创建 `server/src/db.ts`，初始化 SQLite 连接
    - 创建 settings、materials、extractions 三张表
    - settings 表插入默认行（id=1, band_level="6.0", api_base_url="https://api.deepseek.com"）
    - _需求: 1.6, 6.2, 6.4, 6.5_

  - [x] 2.2 实现 Parser 解析器模块
    - 创建 `server/src/parser.ts`，实现 `Parser.parse(raw: string): Extraction[]` 和 `Parser.format(extractions: Extraction[]): string`
    - parse 方法：将 AI 返回的 JSON 字符串解析为结构化摘录对象数组，校验每种类型的必需字段
    - format 方法：将摘录对象数组序列化为 JSON 字符串
    - 对非法 JSON 或缺少必需字段的数据抛出明确错误
    - _需求: 2.10, 2.11, 2.9_

  - [ ]* 2.3 编写 Parser 属性测试
    - **Property 4: 解析器往返一致性** — `Parser.parse(Parser.format(extractions))` 应产生等价结果
    - **验证: 需求 2.10, 2.11, 2.12**

  - [ ]* 2.4 编写 Parser 字段完整性属性测试
    - **Property 5: 摘录类型字段完整性** — 解析后每种类型摘录包含所有必需字段
    - **验证: 需求 2.2, 2.3, 2.4**

  - [ ]* 2.5 编写 Parser 无效响应属性测试
    - **Property 6: 无效 AI 响应错误处理** — 非法 JSON 或缺少字段时抛出错误
    - **验证: 需求 2.9**

- [x] 3. 后端 API — 设置与材料
  - [x] 3.1 实现设置 API（GET/PUT /api/settings）
    - 创建 `server/src/routes/settings.ts`
    - GET 返回当前设置，PUT 更新设置并持久化
    - 验证 band_level 取值范围
    - _需求: 6.1, 6.2, 6.5_

  - [ ]* 3.2 编写设置持久化属性测试
    - **Property 13: 设置持久化往返** — 保存后读取应得到一致的值
    - **验证: 需求 6.2, 6.5**

  - [x] 3.3 实现材料 CRUD API
    - 创建 `server/src/routes/materials.ts`
    - POST /api/materials：验证标题和内容非空，验证来源标签有效，创建材料（parse_status=idle）
    - GET /api/materials：按 created_at 倒序返回材料列表，附带 extractionCount
    - GET /api/materials/:id：返回材料详情
    - DELETE /api/materials/:id：删除材料及其关联摘录
    - _需求: 1.4, 1.5, 1.6, 1.7, 5.1, 5.2_

  - [ ]* 3.4 编写材料持久化属性测试
    - **Property 1: 材料持久化往返** — 创建后查询返回一致数据
    - **验证: 需求 1.6**

  - [ ]* 3.5 编写材料输入验证属性测试
    - **Property 2: 材料输入验证拒绝无效数据** — 空白标题或内容被拒绝
    - **验证: 需求 1.7**

  - [ ]* 3.6 编写材料列表排序属性测试
    - **Property 11: 材料列表时间倒序** — 列表按时间降序排列
    - **验证: 需求 5.2**

- [x] 4. 后端 API — AI 解析与摘录
  - [x] 4.1 实现 AI Service 模块
    - 创建 `server/src/ai-service.ts`，使用 OpenAI SDK 的 `baseURL` 参数
    - 实现 `parseContent(content: string, bandLevel: BandLevel): Promise<string>`
    - 构造 system prompt（包含用户 band_level），设置 30 秒超时
    - 检查 API Key 是否已配置，未配置时返回 422 错误
    - _需求: 2.1, 2.5, 2.6, 6.6_

  - [x] 4.2 实现材料解析 API（POST /api/materials/:id/parse）
    - 更新 parse_status 为 parsing → 调用 AI Service → Parser.parse → 存储摘录 → 更新 parse_status 为 done
    - 失败时设置 parse_status 为 error，不写入摘录
    - 重新解析前清除旧摘录
    - _需求: 2.1, 2.7, 2.8, 2.9_

  - [x] 4.3 实现摘录 API
    - GET /api/materials/:id/extractions：获取指定材料的摘录，支持 type 筛选
    - GET /api/extractions：获取所有摘录，支持 type、mastery、sourceTag 筛选，附带 materialTitle
    - PATCH /api/extractions/:id/mastery：更新掌握状态
    - GET /api/extractions/review：获取未掌握的摘录，支持 materialId 和 type 筛选，随机排序
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_

  - [ ]* 4.4 编写掌握状态往返属性测试
    - **Property 7: 掌握状态往返** — 标记已掌握再取消应恢复为未掌握
    - **验证: 需求 3.3, 3.4**

  - [ ]* 4.5 编写摘录筛选属性测试
    - **Property 8: 摘录筛选正确性** — 筛选结果满足所有条件且无遗漏
    - **验证: 需求 3.2, 3.6**

  - [ ]* 4.6 编写复习集过滤属性测试
    - **Property 9: 复习集只含未掌握摘录** — 复习卡片集中所有摘录均为未掌握
    - **验证: 需求 4.2**

- [x] 5. 检查点 — 后端完成
  - 确保所有后端测试通过，如有问题请向用户确认。

- [x] 6. 前端基础框架
  - [x] 6.1 搭建前端路由和布局
    - 配置 React Router：/、/materials/new、/materials/:id、/extractions、/review、/settings
    - 实现 App 组件和 NavBar 导航栏组件
    - NavBar 包含四个入口：材料库、摘录本、复习模式、设置
    - 当前路由对应的导航入口高亮显示
    - 响应式布局：移动端底部导航栏，桌面端侧边或顶部导航栏
    - _需求: 8.1, 8.2, 8.3, 7.1, 7.2, 7.3_

  - [x] 6.2 实现 API Client 模块
    - 创建 `client/src/api.ts`，封装所有后端 API 请求
    - 实现 ApiClient 接口中定义的所有方法
    - 统一错误处理：网络错误和服务端错误的 toast 提示
    - _需求: 全部 API 交互_

  - [x] 6.3 实现文件格式验证工具函数
    - 创建 `client/src/utils/validation.ts`
    - 实现文件扩展名校验（仅接受 .txt 和 .md）
    - _需求: 1.2, 1.3_

  - [ ]* 6.4 编写文件格式验证属性测试
    - **Property 3: 文件格式验证** — .txt/.md 接受，其他拒绝
    - **验证: 需求 1.3**

  - [ ]* 6.5 编写导航高亮属性测试
    - **Property 14: 导航高亮与路由一致** — 当前路由对应入口高亮，其余不高亮
    - **验证: 需求 8.3**

- [x] 7. 前端页面 — 设置与材料输入
  - [x] 7.1 实现设置页面（Settings）
    - 英语水平选择器：Band 5.0 / 5.5 / 6.0 / 6.5 / 7+
    - AI API Key 输入框和 API Base URL 输入框
    - API Base URL 默认预设为 `https://api.deepseek.com`
    - 保存按钮，调用 PUT /api/settings
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 实现添加材料页面（AddMaterial）
    - 标题输入框、来源标签选择器（Vlog/文章/播客/其他）
    - 文本粘贴区域（textarea）
    - 文件上传按钮（.txt/.md），上传后读取文件内容填入文本区域
    - 不支持的文件格式显示错误提示
    - 表单验证：标题和内容为空时显示错误提示并阻止提交
    - 提交后调用 POST /api/materials，成功后跳转到材料详情页
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.4_

- [x] 8. 前端页面 — 材料库与材料详情
  - [x] 8.1 实现材料库页面（MaterialLibrary）
    - 卡片列表展示所有材料：标题、来源标签、摘录统计数量、添加时间
    - 按添加时间倒序排列
    - 点击卡片跳转到材料详情页
    - "添加新材料"按钮跳转到 /materials/new
    - 响应式：移动端单列，桌面端多列网格
    - _需求: 5.1, 5.2, 5.3, 8.4, 7.2, 7.3_

  - [x] 8.2 实现材料详情页（MaterialDetail）
    - 双 Tab 切换：原文 Tab 和摘录 Tab
    - 原文 Tab：显示完整原文，对已提取的词汇和词组进行高亮标注
    - 摘录 Tab：按类型分组展示摘录卡片，支持类型筛选器
    - "开始解析"按钮（parse_status=idle 或 error 时显示）
    - 解析中显示加载状态指示器
    - 未配置 API Key 时提示并附带跳转设置页链接
    - _需求: 5.4, 5.5, 5.6, 2.1, 2.7, 2.9, 3.1, 3.2, 6.6_

  - [x] 8.3 实现摘录卡片组件（ExtractionCard）
    - 根据摘录类型展示不同字段：词汇（单词、释义、词性、例句）、词组（词组文本、释义、例句）、句子（原句、分析说明、适用场景）
    - 显示优先级标签
    - "标记已掌握"/"取消掌握"按钮
    - _需求: 3.7, 3.3, 3.4, 2.5_

  - [x] 8.4 实现原文高亮函数
    - 创建 `client/src/utils/highlight.ts`
    - 输入原文和词汇/词组摘录列表，输出带高亮标记的 HTML/React 元素
    - _需求: 5.5_

  - [ ]* 8.5 编写原文高亮属性测试
    - **Property 12: 原文高亮覆盖已提取词汇和词组** — 每个已提取词汇和词组在结果中被标记为高亮
    - **验证: 需求 5.5**

- [x] 9. 前端页面 — 摘录本与复习模式
  - [x] 9.1 实现摘录本页面（ExtractionBook）
    - 汇总展示所有材料的摘录
    - 筛选器：类型（词汇/词组/句子）、掌握状态（未掌握/已掌握）、来源标签
    - 复用 ExtractionCard 组件
    - _需求: 3.5, 3.6, 3.7_

  - [x] 9.2 实现复习模式页面（ReviewMode）
    - 复习范围选择：全部摘录或指定材料
    - 摘录类型选择：词汇/词组/句子/全部
    - 开始复习后随机展示未掌握的摘录卡片
    - _需求: 4.1, 4.2_

  - [x] 9.3 实现翻转卡片组件（FlipCard）
    - 正面显示核心内容（词汇→单词、词组→词组文本、句子→原句）
    - 点击翻转显示详细信息（释义、词性、例句、分析说明等）
    - CSS 翻转动画，支持触屏点击
    - _需求: 4.3, 4.4, 7.4_

  - [x] 9.4 实现复习进度和总结
    - 显示当前进度（如"第 3/20 张"）
    - "已掌握"按钮标记当前卡片并展示下一张
    - "下一张"按钮跳过当前卡片
    - 所有卡片复习完毕后显示总结：复习总数、本次标记已掌握数量
    - _需求: 4.5, 4.6, 4.7_

  - [ ]* 9.5 编写复习总结一致性属性测试
    - **Property 10: 复习总结数据一致性** — 复习总数等于初始卡片集大小，已掌握数量等于点击次数
    - **验证: 需求 4.5, 4.7**

- [x] 10. 检查点 — 前端完成
  - 确保所有前端测试通过，如有问题请向用户确认。

- [x] 11. 集成联调与收尾
  - [x] 11.1 前后端联调
    - 配置 Vite 开发代理，将 `/api` 请求代理到 Express 后端
    - 验证完整流程：添加材料 → AI 解析 → 查看摘录 → 复习模式
    - 处理 CORS 和请求头配置
    - _需求: 全部_

  - [x] 11.2 响应式布局调优
    - 验证移动端（<768px）单列布局
    - 验证桌面端（>=768px）多列布局
    - 确保复习卡片翻转在触屏设备上正常工作
    - _需求: 7.1, 7.2, 7.3, 7.4_

- [x] 12. 最终检查点 — 全部完成
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
