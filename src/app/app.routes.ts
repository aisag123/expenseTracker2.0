import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'login',
		loadComponent: () =>
			import('./features/auth/login-page/login-page').then((m) => m.LoginPageComponent)
	},
	{
		path: 'signup',
		loadComponent: () =>
			import('./features/auth/signup-page/signup-page').then((m) => m.SignupPageComponent)
	},
	{
		path: 'profile',
		loadComponent: () =>
			import('./features/profile/profile-page/profile-page').then((m) => m.ProfilePageComponent)
	},
	{
		path: 'transactions',
		loadComponent: () =>
			import('./features/transactions/transactions-page/transactions-page').then(
				(m) => m.TransactionsPageComponent
			)
	},
	{
		path: 'dashboard',
		loadComponent: () =>
			import('./features/dashboard/dashboard-page/dashboard-page').then(
				(m) => m.DashboardPageComponent
			)
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];
