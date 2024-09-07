@echo off
set XWIN=%cd%\winsdk
clang-cl /imsvc "%XWIN%\crt\include" /imsvc "%XWIN%\sdk\include\ucrt" /imsvc "%XWIN%\sdk\include\um" /imsvc "%XWIN%\sdk\include\shared" --target="x86_64-pc-windows-msvc" %*
