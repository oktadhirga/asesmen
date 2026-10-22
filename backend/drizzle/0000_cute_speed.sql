CREATE TABLE `assessment_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`judul` varchar(255) NOT NULL,
	`deskripsi` text,
	`kode_sesi` varchar(50) NOT NULL,
	`waktu_mulai` timestamp NOT NULL,
	`waktu_selesai` timestamp NOT NULL,
	`durasi_menit` int NOT NULL DEFAULT 60,
	`target_jenjang` enum('PELAKSANA','PENGAWAS','ADMINISTRATOR','JPT'),
	`status` enum('DRAFT','BERJALAN','SELESAI') NOT NULL DEFAULT 'DRAFT',
	CONSTRAINT `assessment_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_sessions_kode_sesi_unique` UNIQUE(`kode_sesi`)
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` varchar(50) NOT NULL,
	`nama` varchar(255) NOT NULL,
	`kategori` enum('MANAJERIAL','SOSIO_KULTURAL') NOT NULL,
	`deskripsi` text,
	`bobot_standar` decimal(4,2) DEFAULT '3.00',
	CONSTRAINT `competencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `competencies_kode_unique` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `participant_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_participant_id` int,
	`question_id` int,
	`selected_option_id` int,
	`bobot_diperoleh` int NOT NULL DEFAULT 0,
	`is_ragu` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `participant_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int,
	`label` varchar(5) NOT NULL,
	`teks_opsi` text NOT NULL,
	`bobot_nilai` int NOT NULL,
	CONSTRAINT `question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competency_id` int,
	`kode_soal` varchar(50),
	`skenario_kasus` text NOT NULL,
	`target_level` int DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`user_id` int,
	`token_akses` varchar(50),
	`status` enum('TERDAFTAR','SEDANG_MENGERJAKAN','SELESAI') NOT NULL DEFAULT 'TERDAFTAR',
	`waktu_login` timestamp,
	`waktu_submit` timestamp,
	`tab_switch_count` int NOT NULL DEFAULT 0,
	`total_score` decimal(8,2) DEFAULT '0.00',
	`jpm_percentage` decimal(5,2) DEFAULT '0.00',
	`kategori_kelulusan` enum('MS','MMS','KMS'),
	CONSTRAINT `session_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nip` varchar(50) NOT NULL,
	`nama` varchar(255) NOT NULL,
	`email` varchar(255),
	`password_hash` varchar(255) NOT NULL,
	`role` enum('ADMIN','PESERTA') NOT NULL DEFAULT 'PESERTA',
	`jabatan` varchar(255),
	`instansi` varchar(255),
	`unit_kerja` varchar(255),
	`jenjang_jabatan` enum('PELAKSANA','PENGAWAS','ADMINISTRATOR','JPT') DEFAULT 'PELAKSANA',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_nip_unique` UNIQUE(`nip`)
);
--> statement-breakpoint
ALTER TABLE `participant_answers` ADD CONSTRAINT `participant_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participant_answers` ADD CONSTRAINT `participant_answers_selected_option_id_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participant_answers` ADD CONSTRAINT `fk_ans_session_participant` FOREIGN KEY (`session_participant_id`) REFERENCES `session_participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_competency_id_competencies_id_fk` FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_session_id_assessment_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;