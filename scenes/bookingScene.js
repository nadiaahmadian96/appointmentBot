const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu'); // Import the main menu function

const createBookingScene = (bot, ADMIN_ID) => {
  const bookingScene = new Scenes.WizardScene(
    'bookingScene',
    async (ctx) => {
      // Step 1: Show available time slots
      const appointmentData = await loadAppointmentData();

      // Retrieve the user from the database
      const user = appointmentData.users.find(user => user.userId === ctx.from.id);
      if (!user) {
        await ctx.reply('لطفا ابتدا ثبت نام کنید.');
        return ctx.scene.leave();
      }

      ctx.wizard.state.user = user; // Save user data for later steps

      const availableSlots = appointmentData.slots.filter(slot => slot.available);

      if (availableSlots.length === 0) {
        await ctx.reply('هیچ نوبتی باقی نمانده است.');
        return ctx.scene.leave();
      }

      // Create inline buttons for available slots
      const slotButtons = availableSlots.map(slot => 
        [Markup.button.callback(`${slot.date} ساعت ${slot.time}`, `select_slot_${slot.date}_${slot.time}`)]
      );
      slotButtons.push([Markup.button.callback('بازگشت', 'go_back')]);

      await ctx.reply(
        'لطفا یک زمان برای رزرو نوبت خود انتخاب کنید:',
        Markup.inlineKeyboard(slotButtons)
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      // Step 2: Handle slot selection
      const selectedSlotCallback = ctx.callbackQuery?.data?.match(/select_slot_(.*)_(.*)/);
      if (!selectedSlotCallback) {
        return await ctx.reply('زمان انتخاب شده نامعتبر است. لطفا یک زمان معتبر انتخاب کنید.');
      }

      const selectedDate = selectedSlotCallback[1];
      const selectedTime = selectedSlotCallback[2];

      const appointmentData = await loadAppointmentData();
      const selectedSlot = appointmentData.slots.find(slot => 
        slot.date === selectedDate && slot.time === selectedTime && slot.available
      );

      if (!selectedSlot) {
        await ctx.reply('زمان انتخاب شده نامعتبر است. لطفا یک زمان معتبر انتخاب کنید.');
        return;
      }

      // Mark slot as unavailable and save appointmentData
      selectedSlot.available = false;
      await saveAppointmentData(appointmentData);

      ctx.wizard.state.selectedSlot = selectedSlot;
      await ctx.reply(
        'لطفا رسید پرداخت خود را ارسال کنید:',
        Markup.keyboard([['بازگشت']]).resize()
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      // Step 3: Handle receipt upload and notify admin
      if (ctx.message.text === 'بازگشت') {
        // Release the slot
        const appointmentData = await loadAppointmentData();
        const selectedSlot = appointmentData.slots.find(
          slot => slot.date === ctx.wizard.state.selectedSlot.date &&
                  slot.time === ctx.wizard.state.selectedSlot.time
        );
        if (selectedSlot) {
          selectedSlot.available = true;
          await saveAppointmentData(appointmentData);
        }
        await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
        await sendMainMenu(ctx); // Re-send the main menu to the user
        return ctx.scene.leave();
      }

      if (!ctx.message.photo) {
        await ctx.reply('لطفا یک تصویر از رسید پرداخت ارسال کنید.');
        return;
      }

      const appointmentData = await loadAppointmentData();
      const selectedSlot = ctx.wizard.state.selectedSlot;
      const user = ctx.wizard.state.user;

      if (!selectedSlot) {
        await ctx.reply('هیچ زمان انتخاب نشده است.');
        await ctx.scene.leave();
        return;
      }

      // Generate a unique appointmentId
      const appointmentId = Date.now().toString();

      const appointment = {
        appointmentId, // Include the appointmentId
        userId: ctx.from.id,
        userName: `${user.firstName} ${user.lastName}`,
        idNumber: user.idNumber,            // Include user's ID number
        phoneNumber: user.phoneNumber,      // Include user's phone number
        timeSlot: selectedSlot,
        receiptImageFileId: ctx.message.photo[ctx.message.photo.length - 1].file_id,
        status: 'pending'
      };

      appointmentData.appointments.push(appointment);  // Add to appointments list
      await saveAppointmentData(appointmentData);

      // Build the inline keyboard for admin approval
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('تایید', `confirm_${appointment.appointmentId}`),
          Markup.button.callback('رد', `reject_${appointment.appointmentId}`)
        ]
      ]);

      // Notify admin by sending the photo
      await bot.telegram.sendPhoto(
        ADMIN_ID,
        appointment.receiptImageFileId,
        {
          caption: `یک نوبت جدید ثبت شد:\nنام کاربر: ${appointment.userName}\nکد ملی: ${appointment.idNumber}\nشماره تماس: ${appointment.phoneNumber}\nزمان: ${appointment.timeSlot.date} ساعت ${appointment.timeSlot.time}\nشماره پیگیری: ${appointment.appointmentId}`,
          reply_markup: keyboard.reply_markup
        }
      );

      ctx.wizard.state.receiptReceived = true;

      await ctx.reply('رسید شما دریافت شد. لطفا منتظر تایید توسط منشی مطب باشید.');
      await sendMainMenu(ctx); // Re-send the main menu to the user
      await ctx.scene.leave();
    }
  );

  // Handle 'بازگشت' action at any point in the scene
  bookingScene.action('go_back', async (ctx) => {
    if (ctx.wizard.state.selectedSlot) {
      // Release the slot
      const appointmentData = await loadAppointmentData();
      const selectedSlot = appointmentData.slots.find(
        slot => slot.date === ctx.wizard.state.selectedSlot.date &&
                slot.time === ctx.wizard.state.selectedSlot.time
      );
      if (selectedSlot) {
        selectedSlot.available = true;
        await saveAppointmentData(appointmentData);
      }
    }
    await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
    await sendMainMenu(ctx); // Re-send the main menu to the user
    await ctx.scene.leave();
  });

  // On scene leave, check if slot needs to be released
  bookingScene.on('leave', async (ctx) => {
    if (ctx.wizard.state.selectedSlot && !ctx.wizard.state.receiptReceived) {
      // The user left the scene without completing the booking
      // Release the slot
      const appointmentData = await loadAppointmentData();
      const selectedSlot = appointmentData.slots.find(
        slot => slot.date === ctx.wizard.state.selectedSlot.date &&
                slot.time === ctx.wizard.state.selectedSlot.time
      );
      if (selectedSlot) {
        selectedSlot.available = true;
        await saveAppointmentData(appointmentData);
      }
    }

    // Send main menu to user after leaving the scene
    sendMainMenu(ctx);
  });

  return bookingScene;
};

module.exports = createBookingScene;
