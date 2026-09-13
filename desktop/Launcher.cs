using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Colossus Wake")]
[assembly: AssemblyProduct("Colossus Wake - Kaiju Game")]
[assembly: AssemblyDescription("Local desktop launcher for Colossus Wake")]
[assembly: AssemblyVersion("1.0.0.0")]

internal static class Launcher
{
    [STAThread]
    private static int Main()
    {
        Application.EnableVisualStyles();
        using (var mutex = new Mutex(false, @"Local\ColossusWakeDesktopLauncher"))
        {
            bool ownsMutex = false;
            try
            {
                try { ownsMutex = mutex.WaitOne(0); }
                catch (AbandonedMutexException) { ownsMutex = true; }
                if (!ownsMutex) return 0;
                string root = AppDomain.CurrentDomain.BaseDirectory;
                string script = Path.Combine(root, "Play.ps1");
                if (!File.Exists(script)) throw new FileNotFoundException("Keep Colossus Wake.exe in the Kiju Game folder beside Play.ps1. The Desktop shortcut can stay on your Desktop.");
                string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"WindowsPowerShell\v1.0\powershell.exe");
                var start = new ProcessStartInfo(powershell, "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + script + "\" -AppWindow");
                start.WorkingDirectory = root;
                start.UseShellExecute = false;
                start.CreateNoWindow = true;
                start.WindowStyle = ProcessWindowStyle.Hidden;
                start.RedirectStandardOutput = true;
                start.RedirectStandardError = true;
                // A developer's PORT setting must not silently move game saves
                // to another browser origin or open another local project.
                start.EnvironmentVariables["PORT"] = "4178";
                using (Process child = Process.Start(start))
                {
                    var output = child.StandardOutput.ReadToEndAsync();
                    var errors = child.StandardError.ReadToEndAsync();
                    child.WaitForExit();
                    if (child.ExitCode != 0)
                        throw new InvalidOperationException((output.Result + Environment.NewLine + errors.Result).Trim());
                }
                return 0;
            }
            catch (Exception error)
            {
                MessageBox.Show(error.Message, "Colossus Wake could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
            finally { if (ownsMutex) mutex.ReleaseMutex(); }
        }
    }
}
