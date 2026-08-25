## 环境基线:

Node.js 24.19.0 LTS
pnpm 10.34.5
Corepack 0.35.0

## .nvmrc 文件

作用是让其他开发者运行 `nvm use` 时自动切换到相同 Node 版本

## package.json 字段：

- `"private": true` 表示根目录只是工作区协调项目，不能被误发布到 npm
- `"engines": {...}` 表示 允许范围
- `"packageManager": "pnpm@10.34.5"` 锁定工具版本，Corepack 会读取这个字段
- `pnpm -r build` 根脚本中的 -r 表示递归执行所有工作区脚本 的 build 命令
- `--parallel` 只用于长期运行的开发服务

- `type: module` 表示这个包输出 ESM
- `sideEffects: false` 表示导入 Protocol 不会自动执行全局副作用，构建工具可以因此安全地删除未使用的导出
- `"files": ["dist"]` 表示 未来发布时，只包含编译产物，不把测试、源码配置等一起打包

## pnpm-workspace.yaml 文件 告诉 pnpm 有哪些工作区

## tsconfig.base.json -- 公共质量规则，各工作区的 tsconfig.json 基于这个base规则 进行特有配置

- `noUncheckedIndexedAccess` 如果原来类型是number，开启之后，类型变为 number | undefined
- `exactOptionalPropertyTypes` 它帮我们区分 字段不存在，字段存在但值为 undefined
- `useUnknownInCatchVariables`
- `verbatimModuleSyntax` 强制明确区分类型导入，纯类型不会意外进入最终 js
- `isolatedModules` 确保每个 TypeScript 文件可以被 Vite、esbuild 等工具独立转换，不依赖 TypeScript 对整个项目的特殊跨文件分析
- `skipLibCheck` 跳过第三方 .d.ts 内部检查，但仍检查我们自己的代码。这样不会因为依赖库声明文件中的问题阻塞项目

## pnpm workspace 安装依赖

### 给某个工作区单独安装依赖

使用 pnpm 的 --filter，建议始终在仓库根目录操作

例如 Console 需要 ECharts

```
pnpm --filter @performance-platform/console add echarts
```

只在开发、构建或测试阶段使用的包，加 -D

```
pnpm --filter @performance-platform/server add -D vitest
```

### 给根工作区安装依赖

```
pnpm add -Dw prettier
```

- `-w` 是 --workspace-root 的缩写，表示明确安装到根 package.json
- `-D` 是 把依赖安装到 devDependencies

### 安装内部工作区依赖

```
pnpm --filter @performance-platform/demo-web add @performance-platform/browser@workspace:*
```

### 删除依赖

```
pnpm --filter @performance-platform/console remove echarts
```

### 只运行某个工作区的命令

```
pnpm --filter @performance-platform/console dev
```

## 关于测试用例

业务按模块拆分后，要对模块有清晰的认知：

- 这个模块只负责什么，最好用一个动词描述，这同时也确定了模块的职责边界
- 模块有哪些输入、输出和状态，清晰地列出来，写成状态图
  - 一旦列出状态，测试就不再依赖“灵感”，而是从状态转换中自然产生，比如某个状态前程序是什么样？状态后是什么样？多次调用同一处理会怎样？
- 考虑哪些东西不受该模块控制【这是寻找异常边界最有效的问题】
  - 看模块依赖的外部代码有哪些，比如回调、浏览器API、网络、数据库、用户输入、第三方库等
  - 然后逐个问，某一个外部依赖不存在怎么办？外部依赖抛异常怎么办？外部依赖返回非法值怎么办？外部依赖重复调用怎么办？外部依赖销毁后才调用怎么办？
- 每个输入有哪些等价类别？
  - 不需要穷举所有数值，而是把输入分组，比如对于有限数字，且大于等于0的入参可以划分为：
    - 正常值： 100
    - 合法边界： 0
    - 负数： -1
    - 非数值数字： NaN
    - 正无穷： Infinity
    - 负无穷： -Infinity
- 失败时应该保持什么不变量？【”不变量“是无论成功还是失败都必须成立的规则】
  - 然后反过来设计测试，尝试破坏这些规则
