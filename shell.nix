{ pkgs ? import <nixpkgs> {}}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustup
    rustc
    cargo
    rustfmt
    rust-analyzer
    clippy

    # required by hidapi v1.3.2
    pkg-config
    udev

    binutils.bintools
  ];

  RUST_BACKTRACE = 1;
}