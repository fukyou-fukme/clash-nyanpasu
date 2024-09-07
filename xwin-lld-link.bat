@echo off
set XWIN=%cd%\winsdk
lld-link "%*" /libpath:%XWIN%\crt\lib\x86_64 /libpath:%XWIN%\sdk\lib\um\x86_64 /libpath:%XWIN%\sdk\lib\ucrt\x86_64