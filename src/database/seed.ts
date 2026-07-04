import '../config/env';
import { prisma } from '../utils/db';

async function seed() {
  console.log('Seeding database...');

  // Hapus data lama
  await prisma.education.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.business.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.alumni.deleteMany();
  console.log('Existing data cleared.');

  const alumniData = [
    {
      nik: '3273010101950001',
      name: 'Ahmad Al-Faruq',
      gender: 'Laki-laki',
      maritalStatus: 'Menikah',
      phone: '081234567890',
      email: 'ahmad.al-faruq@email.com',
      province: 'DKI Jakarta',
      address: 'Jl. Raflesia No. 10, Jakarta Selatan',
      bio: 'Lulusan King Saud University, kini aktif sebagai da\'i dan pembina komunitas pemuda Islam',
      careerStatus: 'Pekerja',
      institutionName: 'Lembaga Dakwah Islam',
      position: 'Pembina Komunitas',
    },
    {
      nik: '3273020101950002',
      name: 'Fatimah Az-Zahra',
      gender: 'Perempuan',
      maritalStatus: 'Belum Menikah',
      phone: '081234567891',
      email: 'fatimah.zahra@email.com',
      province: 'Jawa Barat',
      address: 'Jl. Cendrawasih No. 22, Bandung',
      bio: 'Fresh graduate dari Al-Azhar University, Kairo, dengan minat besar di bidang pendidikan Islam dan pemberdayaan perempuan',
      careerStatus: 'Tenaga Pendidik',
      institutionName: 'Pondok Pesantren Al-Hikmah',
      position: 'Guru',
    },
    {
      nik: '3273030101950003',
      name: 'Muhammad Iqbal',
      gender: 'Laki-laki',
      maritalStatus: 'Menikah',
      phone: '081234567892',
      email: 'muhammad.iqbal@email.com',
      province: 'Jawa Timur',
      address: 'Jl. Sultan Agung No. 5, Malang',
      bio: 'Lulusan University of Sharjah, UAE, sekarang mengelola bisnis impor produk Timur Tengah',
      careerStatus: 'Wirausaha',
      institutionName: 'Al-Mizan Impor',
      position: 'Owner',
    },
    {
      nik: '3273040101950004',
      name: 'Khadijah binti Umar',
      gender: 'Perempuan',
      maritalStatus: 'Menikah',
      phone: '081234567893',
      email: 'khadijah.umar@email.com',
      province: 'Sumatera Utara',
      address: 'Jl. Mesjid Raya No. 8, Medan',
      bio: 'Lulusan University of Malaya, kini aktif sebagai peneliti ilmu hadits dan dosen studi Islam',
      careerStatus: 'Tenaga Pendidik',
      institutionName: 'Universitas Islam Negeri Sumatera Utara',
      position: 'Dosen',
    },
    {
      nik: '3273050101950005',
      name: 'Abdurrahman Al-Ghifari',
      gender: 'Laki-laki',
      maritalStatus: 'Belum Menikah',
      phone: '081234567894',
      email: 'abdurrahman.ghifari@email.com',
      province: 'Banten',
      address: 'Jl. Masjid Agung No. 15, Serang',
      bio: 'Mahasiswa S2 jurusan Fikih dan Ushul Fikih di University of Jordan, Yordania',
      careerStatus: 'Mahasiswa',
      institutionName: 'University of Jordan',
    },
    {
      nik: '3273060101950006',
      name: 'Zainab As-Siddiq',
      gender: 'Perempuan',
      maritalStatus: 'Menikah',
      phone: '081234567895',
      email: 'zainab.siddiq@email.com',
      province: 'DI Yogyakarta',
      address: 'Jl. Kauman No. 3, Yogyakarta',
      bio: 'Lulusan Qatar University dan kini aktif sebagai konsultan pendidikan Timur Tengah bagi pelajar Indonesia',
      careerStatus: 'Pekerja',
      institutionName: 'Pusat Studi Timur Tengah',
      position: 'Konsultan Pendidikan',
    },
  ];

  const eduData: Array<{
    countryCode: string;
    university: string;
    faculty: string;
    major: string;
    graduationYear: number;
  }> = [
    { countryCode: 'SA', university: 'King Saud University', faculty: 'Syariah', major: 'Studi Islam', graduationYear: 2015 },
    { countryCode: 'EG', university: 'Al-Azhar University', faculty: 'Ushuluddin', major: 'Ilmu Al-Qur\'an', graduationYear: 2024 },
    { countryCode: 'AE', university: 'University of Sharjah', faculty: 'Ekonomi Islam', major: 'Manajemen Bisnis Syariah', graduationYear: 2018 },
    { countryCode: 'MY', university: 'University of Malaya', faculty: 'Studi Islam', major: 'Ilmu Hadits', graduationYear: 2019 },
    { countryCode: 'JO', university: 'University of Jordan', faculty: 'Syariah', major: 'Fikih dan Ushul Fikih', graduationYear: 2022 },
    { countryCode: 'QA', university: 'Qatar University', faculty: 'Pendidikan', major: 'Pendidikan Islam', graduationYear: 2017 },
  ];

  for (let i = 0; i < alumniData.length; i++) {
    const data = alumniData[i];
    const edu = eduData[i];
    const a = await prisma.alumni.create({
      data: {
        ...data,
        education: {
          create: {
            level: i === 4 ? 'S2' : 'S1',
            countryCode: edu.countryCode,
            university: edu.university,
            faculty: edu.faculty,
            major: edu.major,
            graduationYear: edu.graduationYear,
          },
        },
        certificates: {
          create: {
            name: 'TOEFL ITP 550',
            publisher: 'IIEF Jakarta',
            validUntil: '2027-06-30',
          },
        },
        portfolios: {
          create: [
            { name: i === 0 ? 'Buku "Islam di Era Digital"' : i === 1 ? 'Aplikasi Belajar Al-Qur\'an' : i === 2 ? 'Website Kajian Islam' : i === 3 ? 'Buku "Hadits dalam Kehidupan"' : i === 4 ? 'Aplikasi Fikih Sehari-hari' : 'Website Direktori Alumni', type: 'Buku', year: 2020 + i, link: 'https://example.com/portfolio-' + i },
            { name: 'E-Modul Pembelajaran', type: 'Aplikasi', year: 2021 + i },
          ],
        },
        organizations: {
          create: {
            name: i % 2 === 0 ? 'Komunitas Pelajar Muslim Timur Tengah' : 'Himpunan Mahasiswa Studi Islam',
            type: 'Kemahasiswaan',
            level: 'Internasional',
            position: i % 2 === 0 ? 'Ketua' : 'Sekretaris',
            field: 'Pendidikan Islam',
          },
        },
        socialLinks: {
          create: {
            platform: 'LinkedIn',
            url: `https://linkedin.com/in/${data.name.toLowerCase().replace(/[^a-z]/g, '.')}`,
          },
        },
      },
    });
    console.log(`Created alumni: ${a.name} (${a.id})`);
  }

  console.log('Seed complete: 6 alumni created');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
