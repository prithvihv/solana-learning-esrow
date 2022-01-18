LXC_ROOT_PATH=/var/lib/lxd/storage-pools/default/containers/pristine/rootfs

moveToLxc:
	cd ../ && \
	sudo rsync -rv --exclude=target solana-learning-esrow/ ${LXC_ROOT_PATH}/root/solana-learning-esrow 
	sudo chown -R 1000000:1000000 ${LXC_ROOT_PATH}/root/solana-learning-esrow/
