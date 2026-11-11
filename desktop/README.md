# 人生倾诉器 · Windows 桌面版

把同一套网页应用封装成一个**单文件 EXE**：双击就能用，不需要装 Node.js，也不需要手动开浏览器。

- 产物：`out/人生倾诉器.exe`（约 0.9 MB）
- 运行环境：Windows 10 / 11 x64，系统自带 **Microsoft Edge WebView2 Runtime**（Win11 自带；Win10 通常随 Edge 安装）
- 界面用 WebView2 渲染；记录、录音、AI 配置都保存在 `%LOCALAPPDATA%\LifeConfidant`

## 直接使用

从 [Releases](https://github.com/ppgod-787/life-confidant/releases/latest) 下载 `LifeConfidant-Windows-x64.exe`（下载后可以改名为 `人生倾诉器.exe`），双击运行。

首次启动会：

1. 把内嵌的网页资源解压到 `%LOCALAPPDATA%\LifeConfidant\app\<hash>`
2. 准备 WebView2 用户数据目录 `%LOCALAPPDATA%\LifeConfidant\WebView2`
3. 打开应用窗口

所有数据都在 `%LOCALAPPDATA%\LifeConfidant` 里。卸载时关闭程序，删掉这个文件夹即可。

> EXE 没有代码签名，Windows SmartScreen 可能提示“Windows 已保护你的电脑”。点「更多信息 → 仍要运行」即可。杀毒软件如果误报，请把该文件加入信任。

## 功能说明

桌面版和网页版是同一套前端代码，功能一致：

- 文字 / 语音听写 / 录音记录
- 时间轴与日历
- 结合过往记录的 AI 对话
- 导出 / 导入 JSON 备份（导出文件会保存到系统「下载」文件夹）

语音听写使用 WebView2（Edge）的语音服务，需要联网；录音本身完全在本机。

> 桌面版和网页版属于不同的存储空间，数据不互通。可以用「设置 → 导出备份 / 合并导入」迁移。

## 自己构建

前置条件：

- Windows 10 / 11
- Node.js 18+（构建网页资源）
- .NET Framework 4.8 自带的 `csc.exe`（Windows 自带，无需安装）
- 首次构建会从 NuGet 下载 WebView2 SDK（约 8 MB）

在仓库根目录执行：

```powershell
npm install
powershell -ExecutionPolicy Bypass -File desktop/build.ps1
```

产物在 `desktop/out/人生倾诉器.exe`。

若网页资源已经构建过，可以跳过 `npm run build`：

```powershell
powershell -ExecutionPolicy Bypass -File desktop/build.ps1 -SkipWebBuild
```

构建脚本做了这些事：

1. 确保 `dist/` 存在（需要时运行 `npm run build`）
2. 下载并缓存 WebView2 SDK 到 `desktop/.cache/`
3. 把 `dist/` 压成 zip
4. 用 `csc.exe` 编译 `Program.cs`，把网页 zip、WebView2 托管 DLL 和原生 loader 一起嵌入 EXE
5. 运行期从 EXE 内释放这些资源，加载到 WebView2

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `Program.cs` | WinForms + WebView2 外壳：窗口、权限、下载、外链、单实例、资源释放 |
| `app.manifest` | DPI 感知（PerMonitorV2）与 Windows 兼容性声明 |
| `app.ico` | 应用图标（多尺寸） |
| `build.ps1` | 一键构建脚本 |

## 实现细节

- **单文件**：`web.zip`、`Microsoft.Web.WebView2.Core.dll`、`Microsoft.Web.WebView2.WinForms.dll`、`WebView2Loader.dll` 都作为资源嵌入 EXE；托管 DLL 通过 `AssemblyResolve` 从内存加载，原生 loader 释放到本地目录后 `LoadLibrary`。
- **虚拟域名**：网页从 `https://life.confidant/index.html` 提供，避免 `file://` 对模块、fetch、IndexedDB 的限制，同时让 `localStorage` 有稳定的 origin。
- **麦克风**：拦截 WebView2 的 `PermissionRequested`，只放行麦克风，其余权限拒绝。
- **外链**：`target="_blank"` 与外部导航交给系统默认浏览器打开，应用窗口不会被带走。
- **下载**：导出备份落到系统「下载」目录。
- **单实例**：命名 Mutex，避免重复打开多个窗口。
- **调试**：`人生倾诉器.exe --debug` 会开启 DevTools。

## 常见问题

**提示缺少 WebView2？**  
安装 [Microsoft Edge WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703)，然后重新打开。

**双击没反应？**  
确认是 64 位 Windows；查看任务管理器里是否已有 `人生倾诉器.exe`（单实例会阻止重复启动）。

**语音听写没反应？**  
确认系统麦克风权限已开启，并且网络可用（语音识别依赖 Edge 的在线服务）。录音功能不需要联网。

**数据在哪里？**  
`%LOCALAPPDATA%\LifeConfidant`。想备份可以在应用内导出 JSON；想彻底重置就删掉这个文件夹。
