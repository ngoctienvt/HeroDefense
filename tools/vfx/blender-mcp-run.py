"""Run an on-disk Blender authoring script through the local Blender MCP addon.

Example: uvx --from mcp-for-blender python tools/vfx/blender-mcp-run.py
    assets/vfx-source/huyen-flipbooks/author.py bell vines
"""

import asyncio
import json
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("usage: blender-mcp-run.py SCRIPT KIND [KIND ...]")
    source = Path(sys.argv[1]).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    params = StdioServerParameters(command="uvx", args=["mcp-for-blender"])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            status = await session.call_tool("get_addon_status", {})
            if status.isError:
                raise RuntimeError("Blender MCP addon is unavailable")
            for kind in sys.argv[2:]:
                code = f"KIND = {kind!r}\nexec(compile(open({str(source)!r}, encoding='utf-8').read(), {str(source)!r}, 'exec'))"
                result = await session.call_tool("execute_blender_code", {"code": code})
                messages = [item.text for item in result.content if item.type == "text"]
                print(json.dumps({"kind": kind, "result": messages}, ensure_ascii=False))
                if result.isError or any(message.startswith("Error executing code:") for message in messages):
                    raise RuntimeError(f"Blender failed to author {kind}")


asyncio.run(main())
