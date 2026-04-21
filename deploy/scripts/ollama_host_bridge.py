#!/usr/bin/env python3
"""Expose the host's loopback-only Ollama daemon to Docker containers."""

from __future__ import annotations

import os
import select
import socket
import threading


LISTEN_HOST = os.getenv("OLLAMA_BRIDGE_LISTEN_HOST", "0.0.0.0")
LISTEN_PORT = int(os.getenv("OLLAMA_BRIDGE_LISTEN_PORT", "11435"))
TARGET_HOST = os.getenv("OLLAMA_BRIDGE_TARGET_HOST", "::1")
TARGET_PORT = int(os.getenv("OLLAMA_BRIDGE_TARGET_PORT", "11434"))
BUFFER_SIZE = 65536


def pipe_bytes(client: socket.socket, upstream: socket.socket) -> None:
    sockets = [client, upstream]
    try:
        while True:
            readable, _, _ = select.select(sockets, [], [], 30)
            if not readable:
                continue
            for sock in readable:
                data = sock.recv(BUFFER_SIZE)
                if not data:
                    return
                target = upstream if sock is client else client
                target.sendall(data)
    finally:
        client.close()
        upstream.close()


def handle_client(client: socket.socket, address: tuple[str, int]) -> None:
    upstream = socket.create_connection((TARGET_HOST, TARGET_PORT))
    print(f"bridging {address[0]}:{address[1]} -> {TARGET_HOST}:{TARGET_PORT}", flush=True)
    pipe_bytes(client, upstream)


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen()
    print(
        f"Ollama bridge listening on {LISTEN_HOST}:{LISTEN_PORT} -> {TARGET_HOST}:{TARGET_PORT}",
        flush=True,
    )
    try:
        while True:
            client, address = server.accept()
            thread = threading.Thread(target=handle_client, args=(client, address), daemon=True)
            thread.start()
    finally:
        server.close()


if __name__ == "__main__":
    main()
