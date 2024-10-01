// bot.js
require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const registrationScene = require('./scenes/registrationScene');
const createBookingScene = require('./scenes/bookingScene');
const createAdminScene = require('./scenes/adminScene');
const editDetailsScene = require('./scenes/editDetailsScene');
const createAdminRejectScene = require('./scenes/adminRejectScene');
const createManageAppointmentsScene = require('./scenes/manageAppointmentsScene');
const createManageUsersScene = require('./scenes/manageUsersScene');
const { loadAppointmentData, saveAppointmentData } = require('./utils/dataHandler');
const { sendMainMenu } = require('./utils/menu'); // Import sendMainMenu
const { ADMIN_ID } = require('./config'); // Import ADMIN_ID

// Create the bot instance
const bot = new Telegraf(process.env.BOT_TOKEN);

// Create the scenes
const bookingScene = createBookingScene(bot, ADMIN_ID);
const adminScene = createAdminScene(ADMIN_ID);
const adminRejectScene = createAdminRejectScene();
const manageAppointmentsScene = createManageAppointmentsScene();
const manageUsersScene = createManageUsersScene();

// Scene manager setup
const stage = new Scenes.Stage([
  registrationScene,
  bookingScene,
  adminScene,
  editDetailsScene,
  adminRejectScene,
  manageAppointmentsScene,
  manageUsersScene
]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Main menu
bot.start((ctx) => {
  sendMainMenu(ctx);
});

// Handle 'مدیریت درخواست ها' option
bot.hears('مدیریت درخواست ها', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply('فقط مدیر می‌تواند به این بخش دسترسی داشته باشد.');
  }

  const appointmentData = await loadAppointmentData();
  const pendingAppointments = appointmentData.appointments.filter(app => app.status === 'pending');

  if (pendingAppointments.length === 0) {
    await ctx.reply('هیچ درخواست جدیدی وجود ندارد.');
    return;
  }

  for (const appointment of pendingAppointments) {
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('تایید', `confirm_${appointment.appointmentId}`),
        Markup.button.callback('رد', `reject_${appointment.appointmentId}`)
      ]
    ]);

    const messageText = `درخواست جدید:\n` +
      `نام کاربر: ${appointment.userName}\n` +
      `کد ملی: ${appointment.idNumber}\n` +
      `شماره تماس: ${appointment.phoneNumber}\n` +
      `تاریخ: ${appointment.timeSlot.date} ساعت ${appointment.timeSlot.time}\n` +
      `شماره پیگیری: ${appointment.appointmentId}`;

    if (appointment.receiptImageFileId) {
      // Send the receipt image with the appointment details
      await ctx.telegram.sendPhoto(ctx.chat.id, appointment.receiptImageFileId, {
        caption: messageText,
        reply_markup: keyboard.reply_markup
      });
    } else {
      // If there's no receipt image, send the text message
      await ctx.reply(messageText, keyboard);
    }
  }
});

// Handle 'مدیریت زمان ها' option
bot.hears('مدیریت زمان ها', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply('فقط مدیر می‌تواند به این بخش دسترسی داشته باشد.');
  }
  ctx.scene.enter('adminScene');
});

// Handle 'مدیریت کاربران' option
bot.hears('مدیریت کاربران', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply('فقط مدیر می‌تواند به این بخش دسترسی داشته باشد.');
  }
  ctx.scene.enter('manageUsersScene');
});

// Handle 'مدیریت نوبت ها' option
bot.hears('مدیریت نوبت ها', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply('فقط مدیر می‌تواند به این بخش دسترسی داشته باشد.');
  }
  ctx.scene.enter('manageAppointmentsScene');
});

// Admin confirms appointment
bot.action(/confirm_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery(); // Acknowledge the callback query
  if (ctx.from.id.toString() !== ADMIN_ID) {
    await ctx.reply('شما دسترسی به این عملیات را ندارید.');
    return;
  }

  const appointmentId = ctx.match[1];
  const appointmentData = await loadAppointmentData();

  // Find the appointment and confirm it
  const appointment = appointmentData.appointments.find(
    app => app.appointmentId && app.appointmentId.toString() === appointmentId && app.status === 'pending'
  );

  if (appointment) {
    appointment.status = 'confirmed';

    // Use appointmentId as tracking number
    const trackingNumber = appointment.appointmentId;
    appointment.trackingNumber = trackingNumber;

    await saveAppointmentData(appointmentData);

    // Notify the user with the tracking number
    await bot.telegram.sendMessage(
      appointment.userId,
      `نوبت شما برای ${appointment.timeSlot.date} ساعت ${appointment.timeSlot.time} توسط منشی تایید شد.\n` +
      `شماره پیگیری شما: ${trackingNumber}`
    );

    await ctx.reply(`نوبت تایید شد. شماره پیگیری: ${trackingNumber}`);

    // Send main menu to admin
    sendMainMenu(ctx);

  } else {
    await ctx.reply('نوبتی یافت نشد یا قبلاً بررسی شده است.');

    // Send main menu to admin
    sendMainMenu(ctx);
  }
});

// Admin rejects appointment with reason
bot.action(/reject_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery(); // Acknowledge the callback query
  if (ctx.from.id.toString() !== ADMIN_ID) {
    await ctx.reply('شما دسترسی به این عملیات را ندارید.');
    return;
  }

  const appointmentId = ctx.match[1];

  // Enter the adminRejectScene, passing the appointmentId in the scene state
  await ctx.scene.enter('adminRejectScene', { appointmentId });
});

// Handle registration and booking scenes
bot.hears('ثبت نام', (ctx) => ctx.scene.enter('registrationScene'));

bot.hears('رزرو نوبت', async (ctx) => {
  const appointmentData = await loadAppointmentData();
  const user = appointmentData.users.find(user => user.userId === ctx.from.id);

  if (!user) {
    return ctx.reply('لطفا ابتدا ثبت نام کنید.');
  }

  ctx.scene.enter('bookingScene');
});

bot.hears('ویرایش اطلاعات', (ctx) => ctx.scene.enter('editDetailsScene'));

bot.hears('نوبت های پیشین', async (ctx) => {
  const appointmentData = await loadAppointmentData();
  const userAppointments = appointmentData.appointments.filter(
    app => app.userId === ctx.from.id
  );

  if (userAppointments.length === 0) {
    await ctx.reply('شما هیچ نوبت قبلی ندارید.');
  } else {
    let message = 'نوبت‌های شما:\n';
    userAppointments.forEach(app => {
      message += `\nتاریخ: ${app.timeSlot.date} ساعت ${app.timeSlot.time}\n` +
                 `وضعیت: ${app.status}\n` +
                 `شماره پیگیری: ${app.appointmentId}\n`;
    });
    await ctx.reply(message);
  }
});

// Send main menu after scenes
stage.on('leave', (ctx) => {
  sendMainMenu(ctx);
});

// Start the bot
bot.launch();