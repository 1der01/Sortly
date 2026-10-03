import JSZip from 'jszip';
import mainPy from '../../main.py?raw';
import organizerPy from '../../organizer.py?raw';
import categoriesPy from '../../categories.py?raw';
import testOrganizerPy from '../../test_organizer.py?raw';
import sortlyConfigJson from '../../sortly_config.json?raw';
import requirementsTxt from '../../requirements.txt?raw';
import readmeMd from '../../README.md?raw';

/**
 * Packages and downloads the standalone Python desktop application as a ready-to-run ZIP archive.
 */
export async function downloadPythonAppZip(): Promise<void> {
  const zip = new JSZip();

  zip.file('main.py', mainPy);
  zip.file('organizer.py', organizerPy);
  zip.file('categories.py', categoriesPy);
  zip.file('test_organizer.py', testOrganizerPy);
  zip.file('sortly_config.json', sortlyConfigJson);
  zip.file('requirements.txt', requirementsTxt);
  zip.file('README.md', readmeMd);

  // Add a quick launch batch script for Windows and bash script for macOS/Linux
  const runSh = `#!/usr/bin/env bash
# Quick Launcher for Sortly Desktop File Organizer
cd "$(dirname "$0")" || exit
python3 main.py "$@"
`;
  zip.file('run.sh', runSh);

  const runBat = `@echo off
rem Quick Launcher for Sortly Desktop File Organizer
cd /d "%~dp0"
python main.py %*
pause
`;
  zip.file('run.bat', runBat);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sortly_Python_Desktop_App.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
