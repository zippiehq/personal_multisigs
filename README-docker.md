# Running tests in Docker #

To avoid polluting your local npm environment it is possible to run the tests
inside docker.

## Instructions ##

* Clone the repo locally and change directory into the root.

* Build the [Ganache](https://github.com/trufflesuite/ganache-cli) and test 
containers thus:
```
export YOURORG=somename
docker build . -f Dockerfile-ganache -t ${YOURORG}/ganache
docker build . -f Dockerfile -t ${YOURORG}/personal_multisigs
```

* Run the ganache service and tests
```
docker run --name personal_multisigs_ganache --detach --network=host ${YOURORG}/ganache
docker run --name personal_multisigs_truffle --network=host ${YOURORG}/personal_multisigs truffle test
```

* After success/failure, clean up
```
docker stop personal_multisigs_ganache
docker rm personal_multisigs_ganache personal_multisigs_truffle
```
