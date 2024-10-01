const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu'); // Ensure the main menu is imported

const createManageUsersScene = () => {
  const manageUsersScene = new Scenes.WizardScene(
    'manageUsersScene',
    async (ctx) => {
      // Show the initial menu
      await ctx.reply(
        'لطفا یک گزینه را انتخاب کنید:',
        Markup.keyboard([['مشاهده تمام کاربران', 'جستجوی کاربر'], ['بازگشت']]).resize()
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (ctx.message.text === 'بازگشت') {
        await ctx.reply('به منوی اصلی بازگشتید.');
        await sendMainMenu(ctx); // Send the main menu on exit
        return ctx.scene.leave(); // Leave the scene properly
      }
      const choice = ctx.message.text;
      if (choice === 'مشاهده تمام کاربران') {
        try {
          const appointmentData = await loadAppointmentData();
          const users = appointmentData.users;
          if (users.length > 0) {
            let message = 'لیست کاربران:\n';
            users.forEach(user => {
              message += `\nنام: ${user.firstName} ${user.lastName}\n`;
              message += `شماره ملی: ${user.idNumber}\n`;
              message += `شماره تماس: ${user.phoneNumber}\n`;
            });
            // Split message into chunks if too long
            const messages = splitMessage(message);
            for (const msg of messages) {
              await ctx.reply(msg);
            }
          } else {
            await ctx.reply('هیچ کاربری ثبت نشده است.');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
        }
        await sendMainMenu(ctx); // Return to main menu after listing users
        return ctx.scene.leave();
      } else if (choice === 'جستجوی کاربر') {
        await ctx.reply('لطفا نام یا شماره ملی کاربر را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
        return ctx.wizard.next();
      } else {
        await ctx.reply('لطفا یک گزینه معتبر انتخاب کنید.');
        return; // Do not proceed to the next step if an invalid option is chosen
      }
    },
    async (ctx) => {
      if (ctx.message.text === 'بازگشت') {
        await ctx.reply('به منوی اصلی بازگشتید.');
        await sendMainMenu(ctx); // Send the main menu on exit
        return ctx.scene.leave(); // Leave the scene properly
      }
      const query = ctx.message.text;
      try {
        const appointmentData = await loadAppointmentData();
        const users = appointmentData.users.filter(
          user => user.firstName.includes(query) ||
                  user.lastName.includes(query) ||
                  user.idNumber.includes(query)
        );
        if (users.length > 0) {
          let message = 'کاربران یافت شده:\n';
          users.forEach(user => {
            message += `\nنام: ${user.firstName} ${user.lastName}\n`;
            message += `شماره ملی: ${user.idNumber}\n`;
            message += `شماره تماس: ${user.phoneNumber}\n`;
          });
          // Split message into chunks if too long
          const messages = splitMessage(message);
          for (const msg of messages) {
            await ctx.reply(msg);
          }
        } else {
          await ctx.reply('کاربری با این مشخصات یافت نشد.');
        }
      } catch (error) {
        console.error('Error searching user data:', error);
        await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
      }
      await sendMainMenu(ctx); // Return to main menu after the search
      return ctx.scene.leave(); // Exit the scene after the search
    }
  );

  // On scene leave, send the main menu
  manageUsersScene.on('leave', async (ctx) => {
    await sendMainMenu(ctx);
  });

  // Helper function to split long messages
  function splitMessage(message, maxLength = 4000) {
    const messages = [];
    while (message.length > maxLength) {
      let index = message.lastIndexOf('\n', maxLength);
      if (index === -1) index = maxLength;
      messages.push(message.slice(0, index));
      message = message.slice(index);
    }
    if (message.length > 0) messages.push(message);
    return messages;
  }

  return manageUsersScene;
};

module.exports = createManageUsersScene;
