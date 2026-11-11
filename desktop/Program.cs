using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("人生倾诉器")]
[assembly: AssemblyDescription("用文字和声音记录人生中的重要时刻，在日历里看见时间，让 AI 陪你回头看。")]
[assembly: AssemblyProduct("人生倾诉器")]
[assembly: AssemblyCompany("ppgod-787")]
[assembly: AssemblyCopyright("Copyright © 2026 ppgod-787")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace LifeConfidant
{
    internal static class Program
    {
        private const string MutexName = "LifeConfidant.Desktop.SingleInstance";
        internal static readonly string DataRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LifeConfidant");

        [STAThread]
        private static void Main(string[] args)
        {
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    MessageBox.Show("人生倾诉器已经在运行了。", "人生倾诉器", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                AppDomain.CurrentDomain.AssemblyResolve += ResolveAssembly;
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.ThreadException += delegate(object sender, ThreadExceptionEventArgs e)
                {
                    ShowFatal(e.Exception);
                };
                AppDomain.CurrentDomain.UnhandledException += delegate(object sender, UnhandledExceptionEventArgs e)
                {
                    ShowFatal(e.ExceptionObject as Exception);
                };

                try
                {
                    string webRoot = WebAssets.EnsureExtracted();
                    WebViewRuntime.Prepare();
                    bool debug = Array.IndexOf(args, "--debug") >= 0;
                    Application.Run(new MainForm(webRoot, debug));
                }
                catch (Exception ex)
                {
                    ShowFatal(ex);
                }
            }
        }

        private static void ShowFatal(Exception ex)
        {
            string message = ex == null ? "发生了未知错误。" : ex.Message;
            MessageBox.Show(
                "人生倾诉器启动失败：\n\n" + message +
                "\n\n如果提示缺少 WebView2，请先安装 Microsoft Edge WebView2 Runtime 后再试。",
                "人生倾诉器",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }

        // 供单文件 EXE 使用：把内嵌的 WebView2 托管程序集在需要时加载出来
        private static Assembly ResolveAssembly(object sender, ResolveEventArgs args)
        {
            string simpleName = new AssemblyName(args.Name).Name;
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(simpleName + ".dll"))
            {
                if (stream == null) return null;
                byte[] buffer = new byte[stream.Length];
                int read = 0;
                while (read < buffer.Length)
                {
                    int chunk = stream.Read(buffer, read, buffer.Length - read);
                    if (chunk <= 0) break;
                    read += chunk;
                }
                return Assembly.Load(buffer);
            }
        }
    }

    internal static class WebViewRuntime
    {
        [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr LoadLibrary(string fileName);

        private static bool prepared;

        public static void Prepare()
        {
            if (prepared) return;

            string version = Assembly.GetExecutingAssembly().GetName().Version.ToString();
            string binDir = Path.Combine(Program.DataRoot, "bin", version);
            Directory.CreateDirectory(binDir);
            string loaderPath = Path.Combine(binDir, "WebView2Loader.dll");
            if (!File.Exists(loaderPath)) ExtractResource("WebView2Loader.dll", loaderPath);

            if (LoadLibrary(loaderPath) == IntPtr.Zero)
                throw new InvalidOperationException("无法加载 WebView2 组件（WebView2Loader.dll）。");

            string browserVersion;
            try
            {
                browserVersion = CoreWebView2Environment.GetAvailableBrowserVersionString();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "未检测到 Microsoft Edge WebView2 运行时。请先安装后再打开：\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703", ex);
            }
            if (string.IsNullOrEmpty(browserVersion))
                throw new InvalidOperationException(
                    "未检测到 Microsoft Edge WebView2 运行时。请先安装后再打开：\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703");

            prepared = true;
        }

        private static void ExtractResource(string name, string path)
        {
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            {
                if (stream == null) throw new InvalidOperationException("安装包缺少 " + name);
                string temp = path + ".tmp";
                using (FileStream file = File.Create(temp)) stream.CopyTo(file);
                if (File.Exists(path)) File.Delete(path);
                File.Move(temp, path);
            }
        }
    }

    internal static class WebAssets
    {
        public static string EnsureExtracted()
        {
            byte[] zipBytes;
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("web.zip"))
            {
                if (stream == null) throw new InvalidOperationException("缺少内置页面资源。");
                using (MemoryStream memory = new MemoryStream())
                {
                    stream.CopyTo(memory);
                    zipBytes = memory.ToArray();
                }
            }

            string hash;
            using (SHA256 sha = SHA256.Create())
            {
                byte[] digest = sha.ComputeHash(zipBytes);
                StringBuilder builder = new StringBuilder();
                for (int i = 0; i < 8; i++) builder.Append(digest[i].ToString("x2"));
                hash = builder.ToString();
            }

            string root = Path.Combine(Program.DataRoot, "app", hash);
            if (File.Exists(Path.Combine(root, "index.html"))) return root;

            if (Directory.Exists(root)) Directory.Delete(root, true);
            Directory.CreateDirectory(root);
            string tempZip = Path.Combine(Path.GetTempPath(), "lifeconfidant-" + hash + ".zip");
            File.WriteAllBytes(tempZip, zipBytes);
            try
            {
                ZipFile.ExtractToDirectory(tempZip, root);
            }
            finally
            {
                try { File.Delete(tempZip); } catch { }
            }
            return root;
        }
    }

    internal sealed class MainForm : Form
    {
        private readonly WebView2 browser;
        private readonly string webRoot;
        private readonly bool debug;

        public MainForm(string webRoot, bool debug)
        {
            this.webRoot = webRoot;
            this.debug = debug;

            Text = "人生倾诉器";
            BackColor = Color.FromArgb(246, 241, 232);
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            float scale = 1f;
            try { using (Graphics graphics = CreateGraphics()) scale = graphics.DpiX / 96f; } catch { }
            if (scale <= 0f) scale = 1f;
            int width = Math.Min(area.Width - 80, (int)(1400 * scale));
            int height = Math.Min(area.Height - 80, (int)(880 * scale));
            ClientSize = new Size(Math.Max(900, width), Math.Max(600, height));
            MinimumSize = new Size(860, 560);
            StartPosition = FormStartPosition.CenterScreen;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            browser = new WebView2();
            browser.Dock = DockStyle.Fill;
            browser.DefaultBackgroundColor = Color.FromArgb(246, 241, 232);
            Controls.Add(browser);

            Load += OnLoad;
            FormClosing += OnClosing;
        }

        private async void OnLoad(object sender, EventArgs e)
        {
            try
            {
                string userData = Path.Combine(Program.DataRoot, "WebView2");
                Directory.CreateDirectory(userData);

                CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, userData, null);
                await browser.EnsureCoreWebView2Async(environment);
                CoreWebView2 core = browser.CoreWebView2;

                core.Settings.IsStatusBarEnabled = false;
                core.Settings.AreDevToolsEnabled = debug;
                core.Settings.AreDefaultContextMenusEnabled = true;
                core.Settings.IsZoomControlEnabled = false;
                core.SetVirtualHostNameToFolderMapping(
                    "life.confidant", webRoot, CoreWebView2HostResourceAccessKind.Allow);

                core.PermissionRequested += OnPermissionRequested;
                core.NewWindowRequested += OnNewWindowRequested;
                core.NavigationStarting += OnNavigationStarting;
                core.ProcessFailed += OnProcessFailed;
                core.DownloadStarting += OnDownloadStarting;

                core.Navigate("https://life.confidant/index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "无法启动内置浏览器：\n\n" + ex.Message +
                    "\n\n请确认 Microsoft Edge WebView2 Runtime 已安装：\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703",
                    "人生倾诉器",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                Close();
            }
        }

        private static void OnPermissionRequested(object sender, CoreWebView2PermissionRequestedEventArgs e)
        {
            // 语音听写和录音需要麦克风；其它权限一律不授予
            if (e.PermissionKind == CoreWebView2PermissionKind.Microphone)
            {
                e.State = CoreWebView2PermissionState.Allow;
                return;
            }
            e.State = CoreWebView2PermissionState.Deny;
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            OpenExternal(e.Uri);
        }

        private void OnNavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
        {
            Uri uri;
            if (Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) &&
                uri.Scheme == "https" &&
                uri.Host == "life.confidant")
            {
                return;
            }

            e.Cancel = true;
            OpenExternal(e.Uri);
        }

        private static void OnDownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e)
        {
            try
            {
                string downloads = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                Directory.CreateDirectory(downloads);
                string fileName = Path.GetFileName(e.ResultFilePath);
                if (string.IsNullOrEmpty(fileName)) fileName = "人生倾诉器-备份.json";
                e.ResultFilePath = Path.Combine(downloads, fileName);
            }
            catch
            {
                // 保持 WebView2 的默认下载位置
            }
        }

        private void OnProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
        {
            if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited)
            {
                try { browser.CoreWebView2.Reload(); }
                catch { }
                return;
            }

            MessageBox.Show(
                "显示进程异常退出，请重新打开人生倾诉器。",
                "人生倾诉器",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }

        private static void OpenExternal(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                try { Process.Start(url); } catch { }
            }
        }

        private void OnClosing(object sender, FormClosingEventArgs e)
        {
            try { browser.Dispose(); } catch { }
        }
    }
}
