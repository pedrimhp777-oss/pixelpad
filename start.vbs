' PixelPad - inicia o servidor escondido e abre a pagina de pareamento.
' Duplo clique aqui e o controle fica no ar.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
On Error Resume Next
sh.Run "node.exe """ & dir & "\src\server.mjs""", 0, False
If Err.Number <> 0 Then
  MsgBox "Nao achei o Node.js no PATH." & vbCrLf & vbCrLf & _
         "Instale em https://nodejs.org (versao LTS) e tente de novo.", 48, "PixelPad"
  WScript.Quit
End If
WScript.Sleep 2500
sh.Run "http://127.0.0.1:8080/pair", 1, False
