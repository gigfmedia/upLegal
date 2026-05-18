import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['system-ui', 'sans-serif'],
				serif: ['var(--font-serif)'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				green: {
					900: '#06392F'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'border-spin': {
					'from': { transform: 'rotate(0deg)' },
					'to': { transform: 'rotate(360deg)' },
				},
				slide: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(200%)' },
				},
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-slow': {
					'0%, 100%': {
					transform: 'scale(1)',
					opacity: '0.7',
					},
					'50%': {
					transform: 'scale(1.15)',
					opacity: '1',
					},
				},

				orb: {
					'0%, 100%': {
					transform: 'translate(0px, 0px)',
					},
					'25%': {
					transform: 'translate(-60px, -40px)',
					},
					'50%': {
					transform: 'translate(30px, -80px)',
					},
					'75%': {
					transform: 'translate(-40px, 20px)',
					},
				},

				aurora: {
					'0%': {
					transform: 'translateX(-10%) rotate(-12deg)',
					},
					'50%': {
					transform: 'translateX(10%) rotate(-12deg)',
					},
					'100%': {
					transform: 'translateX(-10%) rotate(-12deg)',
					},
				},

				'spin-ultra-slow': {
					from: {
					transform: 'rotate(0deg)',
					},
					to: {
					transform: 'rotate(360deg)',
					},
				},

				'spin-reverse': {
					from: {
					transform: 'rotate(360deg)',
					},
					to: {
					transform: 'rotate(0deg)',
					},
				},

				particles: {
					'0%': {
					transform: 'translateY(0px)',
					opacity: '0',
					},
					'10%': {
					opacity: '1',
					},
					'100%': {
					transform: 'translateY(-200px)',
					opacity: '0',
					},
				},
			},
			animation: {
				slide: 'slide 6s ease-in-out infinite',
				'spin-slow': 'border-spin 30s linear infinite',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-slow': 'pulse-slow 8s ease-in-out infinite',
				orb: 'orb 18s ease-in-out infinite',
				aurora: 'aurora 15s ease-in-out infinite',
				'spin-ultra-slow': 'spin-ultra-slow 40s linear infinite',
				'spin-reverse': 'spin-reverse 30s linear infinite',
				particles: 'particles linear infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
