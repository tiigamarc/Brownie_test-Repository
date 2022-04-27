def test_storage(SimpleStorage, accounts):
    simple_storage = SimpleStorage.deploy({"from": accounts[0]})

    assert simple_storage.get() == 0
    simple_storage.set(5)
    assert simple_storage.get() == 5
