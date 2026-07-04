export const mockAlumni = {
  id: 'alumni-1',
  nik: '3273010101950001',
  name: 'Ahmad Al-Faruq',
  gender: 'Laki-laki',
  maritalStatus: 'Menikah',
  phone: '081234567890',
  email: 'ahmad@test.com',
  photoUrl: null,
  province: 'DKI Jakarta',
  provinceCode: '31',
  regencyCode: '3171',
  regencyName: 'Jakarta Pusat',
  districtCode: '317101',
  districtName: 'Menteng',
  villageCode: '31710101',
  villageName: 'Menteng',
  address: 'Jl. Raflesia No. 10',
  bio: 'Lulusan King Saud University',
  careerStatus: 'Pekerja',
  careerOther: null,
  institutionName: 'Lembaga Dakwah Islam',
  institutionField: 'Pendidikan Islam',
  position: 'Pembina Komunitas',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockInactiveAlumni = {
  ...mockAlumni,
  id: 'alumni-2',
  nik: '3273010101950002',
  name: 'Fatimah Az-Zahra',
  email: 'fatimah@test.com',
  isActive: false,
};

export const mockAdmin = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  password: '$2a$10$hashedpassword',
  isBuiltin: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSuperAdmin = {
  ...mockAdmin,
  id: 'super-1',
  email: 'super@admin.com',
  name: 'Super Admin',
  role: 'super_admin',
  isBuiltin: true,
};

export const mockEducation = {
  id: 'edu-1',
  alumniId: 'alumni-1',
  level: 'S1',
  countryCode: 'SA',
  university: 'King Saud University',
  faculty: 'Syariah',
  major: 'Studi Islam',
  graduationYear: 2015,
  createdAt: new Date('2024-01-01'),
};

export const mockCertificate = {
  id: 'cert-1',
  alumniId: 'alumni-1',
  name: 'TOEFL ITP 550',
  publisher: 'IIEF Jakarta',
  validUntil: '2027-06-30',
  url: null,
  createdAt: new Date('2024-01-01'),
};

export const mockOrganization = {
  id: 'org-1',
  alumniId: 'alumni-1',
  name: 'Komunitas Pelajar Muslim Timur Tengah',
  type: 'Kemahasiswaan',
  level: 'Internasional',
  position: 'Ketua',
  field: 'Pendidikan Islam',
  createdAt: new Date('2024-01-01'),
};

export const mockBusiness = {
  id: 'bus-1',
  alumniId: 'alumni-1',
  legalForm: 'CV',
  name: 'PT Maju Jaya',
  field: 'Teknologi Informasi',
  products: '["Produk A", "Produk B"]',
  scale: 'Kecil',
  businessModel: 'B2B',
  companyProfile: null,
  website: 'https://maju-jaya.com',
  createdAt: new Date('2024-01-01'),
};

export const mockPortfolio = {
  id: 'port-1',
  alumniId: 'alumni-1',
  name: 'Buku "Islam di Era Digital"',
  type: 'Buku',
  typeOther: null,
  year: 2020,
  link: 'https://example.com/portfolio-0',
  createdAt: new Date('2024-01-01'),
};

export const mockSocialLink = {
  id: 'soc-1',
  alumniId: 'alumni-1',
  platform: 'LinkedIn',
  url: 'https://linkedin.com/in/ahmad.al.faruq',
  createdAt: new Date('2024-01-01'),
};

export const mockWilayah = {
  id: 1,
  kode: '31',
  nama: 'DKI Jakarta',
};
