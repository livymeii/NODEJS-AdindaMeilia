const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

require('./utils/db');
const User = require('./model/user');
const Siswa = require('./model/siswa');

const app = express();
const port = 3000;

// setup
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// konfigurasi session + flash
app.use(cookieParser('secret'));
app.use(
  session({
    cookie: { maxAge: 86400000 },
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

//middleware cek login
function cekLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Silakan login terlebih dahulu');
    return res.redirect('/login');
  }
  next();
}


// halaman login
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Halaman Login',
    layout: false,
    error: req.flash('error'),
    msg: req.flash('msg')
  });
});

// proses login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    req.flash('error', 'Username tidak ditemukan!');
    return res.redirect('/login');
  }

  if (user.password !== password) {
    req.flash('error', 'Password salah!');
    return res.redirect('/login');
  }

  // login berhasil
  req.session.user = user;
  req.flash('msg', 'Login berhasil!');
  res.redirect('/');
});

// logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});


//halaman home
app.get('/', cekLogin, (req, res) => {
  res.render('index', {
    title: 'halaman home',
    layout: 'layouts/main-layout',
    nama: req.session.user.username
  });
});


//halaman about
app.get('/about', cekLogin, (req, res) => {
  res.render('about', {
    title: 'halaman about',
    layout: 'layouts/main-layout',
    nama: req.session.user.username
  });
});


// halaman data siswa
app.get('/siswa', cekLogin, (req, res) => {
  Siswa.find().then((siswas) => {
    res.render('siswa', {
      title: 'halaman data siswa',
      layout: 'layouts/main-layout',
      siswas,
      msg: req.flash('msg'),
    });
  });
});

// halaman tambah data
app.get('/siswa/add', cekLogin, (req, res) => {
  res.render('add-siswa', {
    title: 'form tambah data siswa',
    layout: 'layouts/main-layout',
  });
});

// proses tambah data
app.post(
  '/siswa',
  [
    body('nama').notEmpty().withMessage('Nama wajib diisi'),

    body('nisn')
      .isLength({ min: 10, max: 10 })
      .withMessage('NISN harus 10 digit')
      .custom(async (value) => {
        const duplikat = await Siswa.findOne({ nisn: value });
        if (duplikat) throw new Error('NISN sudah digunakan');
        return true;
      }),

    body('nik')
      .isLength({ min: 16, max: 16 })
      .withMessage('NIK harus 16 digit')
      .custom(async (value) => {
        const duplikat = await Siswa.findOne({ nik: value });
        if (duplikat) throw new Error('NIK sudah digunakan');
        return true;
      }),

    body('nokk')
      .isLength({ min: 16, max: 16 })
      .withMessage('No KK harus 16 digit'),
    body('tgl_masuk')
    .notEmpty().withMessage('Tanggal masuk wajib diisi')
    .isDate().withMessage('Format tanggal tidak valid')
    .custom((value) => {
    if (new Date(value) > new Date('2025-12-04')) {
      throw new Error('Tanggal masuk tidak boleh melebihi 04 Desember 2025');
    }
    return true;
  }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('add-siswa', {
        title: 'form tambah data siswa',
        layout: 'layouts/main-layout',
        errors: errors.array(),
        old: req.body,
      });
    }

    Siswa.insertMany(req.body, (error) => {
      if (error) {
        console.log(error);
        return res.send('Gagal memasukkan data!');
      }

      req.flash('msg', 'data siswa berhasil ditambahkan');
      res.redirect('/siswa');
    });
  }
);

// halaman edit
app.get('/siswa/edit/:nisn', cekLogin, async (req, res) => {
  const siswa = await Siswa.findOne({ nisn: req.params.nisn });

  res.render('edit-siswa', {
    title: 'form ubah data siswa',
    layout: 'layouts/main-layout',
    siswa,
  });
});

// proses edit
app.put(
  '/siswa/:nisn',
  [
    body('tingkat').notEmpty().withMessage('Tingkat wajib diisi'),
    body('rombel').notEmpty().withMessage('Rombel wajib diisi'),
    body('tgl_masuk')
    .notEmpty().withMessage('Tanggal masuk wajib diisi')
    .isDate().withMessage('Format tanggal tidak valid')
    .custom((value) => {
      if (new Date(value) > new Date('2025-12-04')) {
        throw new Error('Tanggal masuk tidak boleh melebihi 04 Desember 2025');
      }
      return true;
    }),
    body('terdaftar').notEmpty().withMessage('Status wajib diisi'),
  ],
  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('edit-siswa', {
        title: 'form ubah data siswa',
        layout: 'layouts/main-layout',
        errors: errors.array(),
        siswa: req.body,
      });
    }

    await Siswa.updateOne(
      { nisn: req.params.nisn },
      {
        $set: {
          tingkat: req.body.tingkat,
          rombel: req.body.rombel,
          tgl_masuk: req.body.tgl_masuk,
          terdaftar: req.body.terdaftar,
        },
      }
    );

    req.flash('msg', 'data siswa berhasil diubah');
    res.redirect('/siswa');
  }
);

// proses delete
app.delete('/siswa/:nisn', cekLogin, (req, res) => {
  Siswa.deleteOne({ nisn: req.params.nisn }).then(() => { 
    req.flash('msg', 'data siswa berhasil dihapus');
    res.redirect('/siswa');
  });
});


app.listen(port, () =>
  console.log(`mongo siswa app || listening at http://localhost:${port}`)
);
