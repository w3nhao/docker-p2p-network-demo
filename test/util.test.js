describe('test utils', () => {
  let ip;
  beforeAll(() => {
    (ip = '12.32.32.44'),
      (objc = {
        '111.22.33.44': null,
        '22.33.44.55': undefined,
        '33.44.55.66': 'sadsa'
      });
  });

  it('test signature', () => {
    const sockets = [];
    for (let keys in objc) {
      if (objc[keys]) sockets.push(keys);
    }

    console.log(JSON.stringify(sockets));
  });
});
