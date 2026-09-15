<template>
  <div>
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="site-header__brand">front<span class="site-header__brand-accent">wire</span></NuxtLink>
      </div>
    </header>
    <main class="page">
      <NuxtPage />
    </main>
  </div>
</template>
