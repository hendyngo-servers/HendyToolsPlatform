#define MyAppName "Hendy Tools Pro"
#define MyAppVersion "3.1.1"
#define MyAppExeName "HendyToolsPro.exe"

[Setup]
AppId={{E6A2BFC9-9B4E-4D50-A5E1-03D8BB815021}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Hendy Tools
DefaultDirName={localappdata}\Programs\Hendy Tools Pro
DefaultGroupName=Hendy Tools Pro
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=Output
OutputBaseFilename=HendyToolsPro-{#MyAppVersion}-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tạo shortcut ngoài Desktop"; GroupDescription: "Shortcut:"; Flags: unchecked

[Files]
Source: "..\dist\HendyToolsPro.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Hendy Tools Pro"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Hendy Tools Pro"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Mở Hendy Tools Pro"; Flags: nowait postinstall skipifsilent
