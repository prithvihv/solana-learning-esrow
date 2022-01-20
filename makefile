LXC_ROOT_PATH=/var/lib/lxd/storage-pools/default/containers/pristine/rootfs

moveToLxc:
	cd ../ && \
	sudo rsync -rv --exclude=target solana-learning-esrow/ ${LXC_ROOT_PATH}/root/solana-learning-esrow 
	sudo chown -R 1000000:1000000 ${LXC_ROOT_PATH}/root/solana-learning-esrow/

build: 
	cargo build-bpf

deploy: build
	solana program deploy /root/solana-learning-esrow/target/deploy/solana_learning_esrow.so 

# https://serverfault.com/questions/140622/how-can-i-port-forward-with-iptables

# iptables -t nat -A PREROUTING -p tcp -i wlp59s0 --dport 8899 -j DNAT --to-destination 10.198.90.79:8899
# iptables -A FORWARD -p tcp -d 10.198.90.79 --dport 8899 -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT


connect-local-solana:
	solana config set --url http://10.198.90.79:8899