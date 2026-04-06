/**
 * Email service using Nodemailer.
 * Configures an SMTP transport from environment variables.
 * Falls back to a no-op transport when SMTP_HOST is not set (logs to console).
 */
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
	if (transporter) return transporter

	const host = process.env.SMTP_HOST
	if (!host) {
		console.warn(
			'SMTP_HOST is not set — emails will be logged to console instead of sent.',
		)
		return null
	}

	transporter = nodemailer.createTransport({
		host,
		port: Number(process.env.SMTP_PORT) || 465,
		secure: (Number(process.env.SMTP_PORT) || 465) === 465,
		auth: {
			user: process.env.SMTP_USER || '',
			pass: process.env.SMTP_PASS || '',
		},
	})

	return transporter
}

function getFrom(): string {
	return process.env.SMTP_FROM || 'Finance Tracker <noreply@example.com>'
}

function getAppUrl(): string {
	return (process.env.APP_URL || 'http://localhost:3001').replace(/\/+$/, '')
}

export interface SendMailOptions {
	to: string
	subject: string
	text: string
	html: string
}

export async function sendMail(options: SendMailOptions): Promise<void> {
	const transport = getTransporter()

	if (!transport) {
		console.log('--- EMAIL (console fallback) ---')
		console.log(`To: ${options.to}`)
		console.log(`Subject: ${options.subject}`)
		console.log(options.text)
		console.log('--- END EMAIL ---')
		return
	}

	await transport.sendMail({
		from: getFrom(),
		to: options.to,
		subject: options.subject,
		text: options.text,
		html: options.html,
	})
}

export async function sendPasswordResetEmail(
	email: string,
	token: string,
): Promise<void> {
	const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`

	await sendMail({
		to: email,
		subject: 'Password Reset — Finance Tracker',
		text: [
			'You requested a password reset for your Finance Tracker account.',
			'',
			'Click the link below to set a new password (valid for 1 hour):',
			resetUrl,
			'',
			'If you did not request this, you can safely ignore this email.',
		].join('\n'),
		html: [
			'<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">',
			'<h2 style="color: #059669;">Finance Tracker</h2>',
			'<p>You requested a password reset for your account.</p>',
			'<p>Click the button below to set a new password (valid for 1 hour):</p>',
			'<p style="text-align: center; margin: 24px 0;">',
			`<a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">`,
			'Reset Password',
			'</a>',
			'</p>',
			`<p style="font-size: 12px; color: #6b7280;">Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>`,
			'<p style="font-size: 12px; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>',
			'</div>',
		].join('\n'),
	})
}
