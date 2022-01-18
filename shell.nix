{ pkgs ? import <nixpkgs> {}}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    rustup
    rustc
    cargo
    rustfmt
    rust-analyzer
    clippy

    binutils.bintools
  ];

  RUST_BACKTRACE = 1;
}