var control = require("../lib/control");
var assert = require("assert");

describe('Control', function() {
  describe('levels', function() {
    it('should have inproc, local and remote', function(done) {
      assert.notEqual(
        control.levels.inproc,
        undefined,
        "control.levels.inproc should exist"
      );
      assert.notEqual(
        control.levels.local,
        undefined,
        "control.levels.local should exist"
      );
      assert.notEqual(
        control.levels.remote,
        undefined,
        "control.levels.remote should exist"
      );
      done();
    });
  });

  describe('levels', function() {
    it('should have hierarchy', function(done) {
      assert.equal(
        control.levels.inproc > control.levels.local,
        true,
        "control.levels.inproc should be greater than control.levels.local"
      );
      assert.equal(
        control.levels.inproc > control.levels.remote,
        true,
        "control.levels.inproc should be greater than control.levels.remote"
      );
      assert.equal(
        control.levels.local > control.levels.remote,
        true,
        "control.levels.local should be greater than control.levels.remote"
      );
      done();
    });
  });

  describe('setControls', function() {
    it('returns controls', function(done) {
      var controls = control.setControls({"test": "inproc"});
      assert.equal(controls.test, control.levels.inproc);
      done();
    });
  });

  describe('setControls', function() {
    it('should throw if level does not exist', function(done) {
      assert.throws(function() {
        control.setControls({"test": "does not exist"});
      });
      done();
    });
  });

  describe('addControls', function() {
    it('should add to controls', function(done) {
      control.setControls({"test": "inproc"});
      var controls = control.addControls({"test2": "local"});
      assert.equal(controls.test, control.levels.inproc);
      assert.equal(controls.test2, control.levels.local);
      done();
    });
  });

  describe('addControls', function() {
    it('should override existing controls', function(done) {
      control.setControls({"test": "inproc"});
      var controls = control.addControls({"test": "local"});
      assert.equal(controls.test, control.levels.local);
      done();
    });
  });

  describe('authorize', function() {
    it('should authorize for exact match', function(done) {
      control.setControls({"test": "inproc"});
      var isAuthorized = control.authorize("test", control.levels.inproc);
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
  });

  describe('authorize', function() {
    it('should authorize inproc if allowed control is local', function(done) {
      control.setControls({"test": "local"});
      var isAuthorized = control.authorize("test", control.levels.inproc);
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
  });

  describe('authorize', function() {
    it('default is remote and should authorize', function(done) {
      control.setControls({});
      var isAuthorized = control.authorize("test", control.levels.local);
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
  });

  describe('authorize keys', function() {
    it('key not found, access NOT granted', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc");
      var isAuthorized = control.authorize("test", control.levels.remote, "X");
      assert.equal(isAuthorized, false, "isAuthorized should be false.");
      done();
    });
    it('key not found, access IS granted', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc");
      var isAuthorized = control.authorize("test", control.levels.local, "X");
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
    it('key found, access NOT granted', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc:disabled");
      var isAuthorized = control.authorize("test", control.levels.local, "abc");
      assert.equal(isAuthorized, false, "isAuthorized should be false.");
      done();
    });
    it('key found, access IS granted', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc");
      var isAuthorized = control.authorize("test", control.levels.local, "abc");
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
    it('key found, specials rights PREVENT access', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc[test:inproc]");
      var isAuthorized = control.authorize("test", control.levels.local, "abc");
      assert.equal(isAuthorized, false, "isAuthorized should be false.");
      done();
    });
    it('key found, specials rights ALLOW access', function(done) {
      control.setControls({ "test": "local"});
      control.setAccessKey("abc[test:remote]");
      var isAuthorized =
        control.authorize("test", control.levels.remote, "abc");
      assert.equal(isAuthorized, true, "isAuthorized should be true.");
      done();
    });
  });
});